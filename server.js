const express = require('express');
const fs = require('fs').promises; // Menggunakan fs.promises untuk async/await
const path = require('path');
const multer = require('multer');
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECTS_FILE_PATH = path.join(__dirname, 'data', 'projects.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'images');

// Pastikan direktori upload ada
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Middleware
app.use(express.json()); // Untuk parsing application/json
app.use(express.urlencoded({ extended: true })); // Untuk parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file statis dari folder 'public'

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Membuat nama file unik: idpendek-namaasli.ekstensi
        const uniqueSuffix = shortid.generate();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '-').toLowerCase()}${extension}`);
    }
});
const upload = multer({ storage: storage });

// --- Helper Functions ---
async function readProjects() {
    try {
        const data = await fs.readFile(PROJECTS_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') { // File tidak ditemukan
            return []; // Kembalikan array kosong jika file belum ada
        }
        console.error("Error reading projects file:", error);
        throw error; // Lempar error untuk ditangani di route
    }
}

async function writeProjects(projects) {
    try {
        await fs.writeFile(PROJECTS_FILE_PATH, JSON.stringify(projects, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing projects file:", error);
        throw error;
    }
}

// --- API Endpoints ---

// GET semua proyek
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await readProjects();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: "Gagal memuat proyek." });
    }
});

// POST proyek baru
// 'projectImage' adalah nama field di form untuk file gambar
app.post('/api/projects', upload.single('projectImage'), async (req, res) => {
    try {
        const projects = await readProjects();
        const { projectId, projectTitle, shortDescription, longDescription, projectTools } = req.body;

        if (!projectTitle || !shortDescription || !longDescription || !projectTools) {
            return res.status(400).json({ message: "Semua field teks wajib diisi." });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Gambar proyek wajib diunggah." });
        }

        const newProject = {
            id: projectId || shortid.generate(),
            title: projectTitle,
            image: `/images/${req.file.filename}`, // Path ke gambar yang disimpan di server
            shortDescription,
            longDescription,
            tools: projectTools.split(',').map(tool => tool.trim()).filter(tool => tool)
        };

        projects.push(newProject);
        await writeProjects(projects);
        res.status(201).json(newProject);
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ message: "Gagal menyimpan proyek." });
    }
});

// DELETE proyek berdasarkan ID
app.delete('/api/projects/:id', async (req, res) => {
    try {
        let projects = await readProjects();
        const projectId = req.params.id;
        const projectIndex = projects.findIndex(p => p.id === projectId);

        if (projectIndex === -1) {
            return res.status(404).json({ message: "Proyek tidak ditemukan." });
        }

        // Hapus file gambar terkait (opsional, tapi praktik yang baik)
        const projectToDelete = projects[projectIndex];
        if (projectToDelete.image) {
            const imagePath = path.join(__dirname, 'public', projectToDelete.image);
            try {
                await fs.unlink(imagePath);
                console.log(`Gambar dihapus: ${imagePath}`);
            } catch (unlinkError) {
                // Tidak fatal jika gambar tidak ada atau gagal dihapus, log saja
                console.warn(`Gagal menghapus gambar ${imagePath}:`, unlinkError.message);
            }
        }

        projects.splice(projectIndex, 1);
        await writeProjects(projects);
        res.status(200).json({ message: "Proyek berhasil dihapus." });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus proyek." });
    }
});

// --- Menyajikan Halaman Frontend ---
// Tangani semua rute lain dengan mengirimkan index.html agar SPA/navigasi sisi klien bekerja
// (Jika Anda hanya memiliki upload.html dan index.html, ini mungkin tidak terlalu penting,
// tapi praktik yang baik untuk SPA)

// Rute untuk halaman unggah
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Rute default untuk halaman utama (portofolio)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Portofolio utama: http://localhost:${PORT}`);
    console.log(`Halaman unggah proyek: http://localhost:${PORT}/upload`);
});
