    // public/js/upload-script.js
    document.addEventListener('DOMContentLoaded', () => {
        const projectUploadForm = document.getElementById('projectUploadForm');
        const imagePreview = document.getElementById('imagePreview');
        const projectImageInput = document.getElementById('projectImage');
        const savedProjectsList = document.getElementById('savedProjectsList');
        const exportDataButton = document.getElementById('exportDataButton');
        const exportOutputContainer = document.getElementById('exportOutputContainer');
        const jsonOutputTextarea = document.getElementById('jsonOutput');
        const clearFormButton = document.getElementById('clearFormButton');
        // const imagePathInput = document.getElementById('imagePath'); // Field ini tidak lagi utama karena server menangani path
        const copyJsonButton = document.getElementById('copyJsonButton');
        const clearAllDataButton = document.getElementById('clearAllDataButton'); // Tombol ini akan dihapus karena data di server


        // Fungsi untuk menampilkan pratinjau gambar
        if (projectImageInput) {
            projectImageInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file && imagePreview) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.src = e.target.result;
                        imagePreview.classList.remove('hidden');
                    }
                    reader.readAsDataURL(file);
                } else if (imagePreview) {
                    imagePreview.src = "#";
                    imagePreview.classList.add('hidden');
                }
            });
        }

        // Fungsi untuk menghasilkan ID unik sederhana (jika diperlukan di klien, meskipun server akan membuatnya)
        function generateProjectIdClient() {
            return `proyek-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        }

        // Fungsi untuk merender daftar proyek yang diambil dari server
        async function renderSavedProjects() {
            try {
                const response = await fetch('/api/projects');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const projects = await response.json();

                if (savedProjectsList) {
                    savedProjectsList.innerHTML = ''; // Kosongkan daftar sebelumnya
                    if (projects.length === 0) {
                        savedProjectsList.innerHTML = '<p class="text-slate-400">Belum ada proyek yang disimpan di server.</p>';
                        return;
                    }

                    projects.forEach((project) => {
                        const projectItem = document.createElement('div');
                        projectItem.className = 'project-item';
                        // Path gambar sudah benar dari server
                        const imageUrl = project.image.startsWith('/') ? project.image : `/${project.image}`;
                        projectItem.innerHTML = `
                            <div class="flex-grow">
                                <h4 class="project-item-title">${project.title}</h4>
                                <p class="project-item-id">ID: ${project.id}</p>
                                <img src="${imageUrl}" alt="${project.title}" class="w-16 h-16 object-cover rounded mt-1">
                            </div>
                            <button class="delete-project-btn" data-id="${project.id}"><i class="fas fa-trash-alt mr-1"></i>Hapus</button>
                        `;
                        savedProjectsList.appendChild(projectItem);
                    });

                    document.querySelectorAll('.delete-project-btn').forEach(button => {
                        button.addEventListener('click', async function() {
                            const projectId = this.dataset.id;
                            await deleteProjectFromServer(projectId);
                        });
                    });
                }
            } catch (error) {
                console.error("Gagal memuat proyek dari server:", error);
                if(savedProjectsList) savedProjectsList.innerHTML = '<p class="text-red-400">Gagal memuat daftar proyek.</p>';
            }
        }
        
        // Fungsi untuk menghapus proyek dari server
        async function deleteProjectFromServer(projectId) {
            if (confirm(`Apakah Anda yakin ingin menghapus proyek dengan ID "${projectId}" dari server?`)) {
                try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }
                    alert('Proyek berhasil dihapus dari server.');
                    renderSavedProjects(); // Render ulang daftar
                     // Sembunyikan output JSON jika sedang ditampilkan
                    if (exportOutputContainer) {
                        exportOutputContainer.classList.add('hidden');
                        if (jsonOutputTextarea) jsonOutputTextarea.value = '';
                    }
                } catch (error) {
                    console.error("Gagal menghapus proyek:", error);
                    alert(`Gagal menghapus proyek: ${error.message}`);
                }
            }
        }

        // Event listener untuk submit form
        if (projectUploadForm) {
            projectUploadForm.addEventListener('submit', async function(event) {
                event.preventDefault();

                const formData = new FormData(); // Gunakan FormData untuk mengirim file

                // Ambil ID, jika kosong server akan generate
                let projectIdVal = document.getElementById('projectId').value.trim();
                if (projectIdVal) formData.append('projectId', projectIdVal);
                
                formData.append('projectTitle', document.getElementById('projectTitle').value.trim());
                formData.append('shortDescription', document.getElementById('shortDescription').value.trim());
                formData.append('longDescription', document.getElementById('longDescription').value.trim());
                formData.append('projectTools', document.getElementById('projectTools').value.trim());
                
                // Ambil file gambar
                const imageFile = projectImageInput.files[0];
                if (imageFile) {
                    formData.append('projectImage', imageFile);
                } else {
                    alert('Gambar proyek wajib diunggah.');
                    return;
                }
                
                // Validasi sisi klien sederhana sebelum mengirim
                if (!formData.get('projectTitle') || !formData.get('shortDescription') || !formData.get('longDescription') || !formData.get('projectTools')) {
                     alert('Harap isi semua field teks yang wajib diisi (*).');
                     return;
                }

                try {
                    const response = await fetch('/api/projects', {
                        method: 'POST',
                        body: formData // Kirim sebagai FormData
                        // Tidak perlu 'Content-Type' header, browser akan set otomatis untuk FormData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                    // const newProject = await response.json(); // Data proyek yang baru ditambahkan
                    alert('Proyek berhasil diunggah ke server!');
                    projectUploadForm.reset();
                    if (imagePreview) {
                        imagePreview.src = "#";
                        imagePreview.classList.add('hidden');
                    }
                    renderSavedProjects(); // Muat ulang daftar dari server
                    // Update JSON output jika sedang ditampilkan
                    if (exportOutputContainer && !exportOutputContainer.classList.contains('hidden')) {
                        const projects = await (await fetch('/api/projects')).json();
                        jsonOutputTextarea.value = JSON.stringify(projects, null, 2);
                    }

                } catch (error) {
                    console.error("Gagal mengunggah proyek:", error);
                    alert(`Gagal mengunggah proyek: ${error.message}`);
                }
            });
        }

        // Event listener untuk tombol "Bersihkan Form"
        if (clearFormButton) {
            clearFormButton.addEventListener('click', () => {
                if (projectUploadForm) projectUploadForm.reset();
                if (imagePreview) {
                    imagePreview.src = "#";
                    imagePreview.classList.add('hidden');
                }
            });
        }
        
        // Tombol "Hapus Semua Data Lokal" tidak relevan lagi karena data di server
        if (clearAllDataButton) {
            clearAllDataButton.style.display = 'none'; // Sembunyikan tombol ini
        }

        // Event listener untuk tombol "Ekspor Data Proyek" (sekarang mengambil dari server)
        if (exportDataButton) {
            exportDataButton.addEventListener('click', async () => {
                try {
                    const response = await fetch('/api/projects');
                    if (!response.ok) throw new Error('Gagal memuat data dari server');
                    const projects = await response.json();

                    if (projects.length === 0) {
                        alert('Tidak ada data proyek untuk diekspor dari server.');
                        if (exportOutputContainer) exportOutputContainer.classList.add('hidden');
                        return;
                    }
                    if (jsonOutputTextarea) {
                        jsonOutputTextarea.value = JSON.stringify(projects, null, 2);
                    }
                    if (exportOutputContainer) {
                        exportOutputContainer.classList.remove('hidden');
                    }
                } catch (error) {
                    alert(error.message);
                    console.error(error);
                }
            });
        }
        
        if (copyJsonButton && jsonOutputTextarea) {
            copyJsonButton.addEventListener('click', () => {
                jsonOutputTextarea.select();
                jsonOutputTextarea.setSelectionRange(0, 99999); 
                try {
                    const successful = document.execCommand('copy');
                    alert(successful ? 'Berhasil disalin!' : 'Gagal menyalin.');
                } catch (err) {
                    alert('Gagal menyalin.');
                    console.error('Gagal menyalin JSON: ', err);
                }
                window.getSelection().removeAllRanges();
            });
        }

        const currentYearUploadElement = document.getElementById('currentYearUpload');
        if (currentYearUploadElement) {
            currentYearUploadElement.textContent = new Date().getFullYear();
        }

        renderSavedProjects(); // Render proyek dari server saat halaman dimuat
    });
    