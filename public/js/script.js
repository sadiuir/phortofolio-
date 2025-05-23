    // public/js/script.js

    document.addEventListener('DOMContentLoaded', () => {
        // HAPUS ATAU KOMENTARI ARRAY 'projects' YANG STATIS DARI SINI
        // const projects = [ /* ... data proyek statis ... */ ];

        // --- WIB Clock --- (Kode jam tetap sama)
        const clockElement = document.getElementById('clockWIB');
        const clockElementMobile = document.getElementById('clockWIBMobile');

        function updateClockWIB() {
            const now = new Date();
            const options = {
                timeZone: 'Asia/Jakarta',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            try {
                const timeString = now.toLocaleString('id-ID', options);
                if (clockElement) clockElement.textContent = `${timeString} WIB`;
                if (clockElementMobile) clockElementMobile.textContent = `${timeString} WIB`;
            } catch (e) {
                console.warn("Browser tidak mendukung timezone di toLocaleString.", e);
                // Fallback jika ada
            }
        }
        updateClockWIB();
        setInterval(updateClockWIB, 1000);
        // --- End WIB Clock ---

        // --- Slider Elements and Logic ---
        const projectViewport = document.getElementById('project-viewport');
        const projectSliderInner = document.getElementById('project-slider-inner');
        const prevProjectBtn = document.getElementById('prevProjectBtn');
        const nextProjectBtn = document.getElementById('nextProjectBtn');

        let currentLogicalIndex = 0;
        let currentActualDomIndex = 0;
        let projectCardWidth = 0;
        let autoScrollInterval;
        const AUTO_SCROLL_DELAY = 5000;
        let numPrependedClones = 0;
        let numOriginalProjects = 0; // Akan diisi setelah fetch
        let projectsData = []; // Menyimpan data proyek dari server
        let isTransitioning = false;
        let isHoveringSlider = false;
        let isModalOpenGlobal = false;

        function createProjectCardDOM(project) {
            const card = document.createElement('div');
            card.className = 'project-slide-card bg-slate-800 rounded-lg shadow-xl overflow-hidden p-0';
            // Pastikan path gambar benar (server akan menyajikan dari /images/)
            const imageUrl = project.image.startsWith('/') ? project.image : `/${project.image}`;
            card.innerHTML = `
                <div class="p-6">
                    <img src="${imageUrl}" alt="Foto ${project.title}" class="w-full h-48 object-cover mb-4 rounded" onerror="this.onerror=null;this.src='https://placehold.co/600x400/cccccc/FFFFFF?text=Gambar+Error';this.alt='Gambar error';">
                    <h3 class="text-xl font-semibold mb-2 text-amber-400 h-14 overflow-hidden">${project.title}</h3>
                    <p class="text-slate-300 text-sm mb-4 h-20 overflow-hidden">${project.shortDescription}</p>
                    <button data-project-id="${project.id}" class="btn-primary open-modal-button w-full text-sm sm:text-base">
                        Lihat Detail Proyek <i class="fas fa-arrow-right ml-1 sm:ml-2"></i>
                    </button>
                </div>
            `;
            return card;
        }

        // ... (fungsi updateActiveCardHighlight, calculateCardWidthAndSetup, updateSliderPosition, handleTransitionEnd, nextProject, prevProject, startAutoScroll, stopAutoScroll tetap SAMA seperti sebelumnya, pastikan mereka ada di sini) ...
        // Mulai dari sini, fungsi-fungsi slider helper (seperti yang sudah ada sebelumnya)
        function updateActiveCardHighlight() {
            if (!projectSliderInner || !projectSliderInner.children || projectSliderInner.children.length === 0 || numOriginalProjects === 0) return;
            const allCards = projectSliderInner.children;
            for (let i = 0; i < allCards.length; i++) {
                allCards[i].classList.remove('is-active-slide');
            }
            const activeIndex = numPrependedClones + currentLogicalIndex;
            if (activeIndex < allCards.length) {
                const activeCardInDom = allCards[activeIndex];
                if (activeCardInDom) {
                    activeCardInDom.classList.add('is-active-slide');
                }
            }
        }

        function calculateCardWidthAndSetup() {
            if (!projectSliderInner || !projectSliderInner.children || projectSliderInner.children.length === 0) {
                projectCardWidth = 0;
                return;
            }
            const firstCard = projectSliderInner.children[0];
            if (firstCard) {
                const marginRight = parseFloat(getComputedStyle(firstCard).marginRight) || 0;
                projectCardWidth = firstCard.offsetWidth + marginRight;
            } else {
                projectCardWidth = 0;
            }
        }

        function updateSliderPosition(targetActualDomIdx, animate = true) {
            if (!projectSliderInner || projectCardWidth === 0 || isNaN(targetActualDomIdx) || targetActualDomIdx < 0) {
                return;
            }
            isTransitioning = animate;
            projectSliderInner.style.transition = animate ? 'transform 0.5s ease-in-out' : 'none';
            const offset = -targetActualDomIdx * projectCardWidth;
            projectSliderInner.style.transform = `translateX(${offset}px)`;
            currentActualDomIndex = targetActualDomIdx;

            if (!animate) {
                projectSliderInner.offsetHeight;
                projectSliderInner.style.transition = 'transform 0.5s ease-in-out';
                setTimeout(() => { isTransitioning = false; }, 50);
            }
        }
        
        function handleTransitionEnd() {
            if (!isTransitioning && projectSliderInner.style.transition === 'none') { return; }
            if (!isTransitioning) return;
            isTransitioning = false;
            let didJump = false;
            if (currentActualDomIndex >= numPrependedClones + numOriginalProjects) {
                currentActualDomIndex = numPrependedClones + currentLogicalIndex;
                updateSliderPosition(currentActualDomIndex, false);
                didJump = true;
            } else if (currentActualDomIndex < numPrependedClones) {
                currentActualDomIndex = numPrependedClones + currentLogicalIndex;
                updateSliderPosition(currentActualDomIndex, false);
                didJump = true;
            }
            if (!didJump && !isHoveringSlider && !isModalOpenGlobal) { startAutoScroll(); }
            else if (didJump) { setTimeout(() => { if (!isHoveringSlider && !isModalOpenGlobal) startAutoScroll(); }, 50); }
        }

        function nextProject() {
            if (isTransitioning || numOriginalProjects <= 1) return;
            stopAutoScroll();
            currentLogicalIndex = (currentLogicalIndex + 1) % numOriginalProjects;
            currentActualDomIndex++;
            updateSliderPosition(currentActualDomIndex, true);
            updateActiveCardHighlight();
        }

        function prevProject() {
            if (isTransitioning || numOriginalProjects <= 1) return;
            stopAutoScroll();
            currentLogicalIndex = (currentLogicalIndex - 1 + numOriginalProjects) % numOriginalProjects;
            currentActualDomIndex--;
            updateSliderPosition(currentActualDomIndex, true);
            updateActiveCardHighlight();
        }

        function startAutoScroll() {
            if (numOriginalProjects <= 1 || isModalOpenGlobal || isHoveringSlider) return;
            stopAutoScroll();
            autoScrollInterval = setInterval(nextProject, AUTO_SCROLL_DELAY);
        }

        function stopAutoScroll() { clearInterval(autoScrollInterval); }
        // Akhir dari fungsi-fungsi slider helper

        async function initializeSlider() {
            try {
                const response = await fetch('/api/projects');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                projectsData = await response.json();
                numOriginalProjects = projectsData.length;

                if (!projectSliderInner || !prevProjectBtn || !nextProjectBtn) return;
                projectSliderInner.innerHTML = '';

                if (numOriginalProjects === 0) {
                    projectSliderInner.innerHTML = '<p class="text-center text-slate-400 w-full">Belum ada proyek untuk ditampilkan.</p>';
                    prevProjectBtn.style.display = 'none';
                    nextProjectBtn.style.display = 'none';
                    return;
                }
                if (numOriginalProjects === 1) {
                    projectSliderInner.appendChild(createProjectCardDOM(projectsData[0]));
                    prevProjectBtn.style.display = 'none';
                    nextProjectBtn.style.display = 'none';
                    requestAnimationFrame(() => { // Ganti setTimeout dengan requestAnimationFrame
                        calculateCardWidthAndSetup();
                        if (projectSliderInner.firstChild) projectSliderInner.firstChild.classList.add('is-active-slide');
                    });
                    return;
                }

                prevProjectBtn.style.display = 'block';
                nextProjectBtn.style.display = 'block';
                numPrependedClones = Math.min(numOriginalProjects, 3);

                projectsData.forEach(project => projectSliderInner.appendChild(createProjectCardDOM(project)));
                for (let i = 0; i < numPrependedClones; i++) {
                    const clone = createProjectCardDOM(projectsData[(numOriginalProjects - 1 - i + numOriginalProjects) % numOriginalProjects]);
                    projectSliderInner.insertBefore(clone, projectSliderInner.firstChild);
                }
                for (let i = 0; i < numPrependedClones; i++) {
                    const clone = createProjectCardDOM(projectsData[i % numOriginalProjects]);
                    projectSliderInner.appendChild(clone);
                }

                requestAnimationFrame(() => { // Ganti setTimeout dengan requestAnimationFrame
                    calculateCardWidthAndSetup();
                    if (projectCardWidth > 0) {
                        currentLogicalIndex = 0;
                        currentActualDomIndex = numPrependedClones;
                        updateSliderPosition(currentActualDomIndex, false);
                        updateActiveCardHighlight();
                        startAutoScroll();
                    } else {
                        console.warn("Lebar kartu proyek tidak dapat ditentukan. Slider mungkin tidak berfungsi dengan benar.");
                    }
                });

                projectSliderInner.removeEventListener('transitionend', handleTransitionEnd);
                projectSliderInner.addEventListener('transitionend', handleTransitionEnd);
                nextProjectBtn.removeEventListener('click', nextProject);
                nextProjectBtn.addEventListener('click', nextProject);
                prevProjectBtn.removeEventListener('click', prevProject);
                prevProjectBtn.addEventListener('click', prevProject);

                if (projectViewport) {
                    projectViewport.removeEventListener('mouseenter', handleSliderMouseEnter);
                    projectViewport.removeEventListener('mouseleave', handleSliderMouseLeave);
                    projectViewport.addEventListener('mouseenter', handleSliderMouseEnter);
                    projectViewport.addEventListener('mouseleave', handleSliderMouseLeave);
                }

            } catch (error) {
                console.error("Gagal memuat data proyek:", error);
                if (projectSliderInner) projectSliderInner.innerHTML = '<p class="text-center text-red-400 w-full">Gagal memuat proyek. Coba lagi nanti.</p>';
                if (prevProjectBtn) prevProjectBtn.style.display = 'none';
                if (nextProjectBtn) nextProjectBtn.style.display = 'none';
            }
        }
        
        function handleSliderMouseEnter() {
            isHoveringSlider = true;
            stopAutoScroll();
        }
        function handleSliderMouseLeave() {
            isHoveringSlider = false;
            if (!isModalOpenGlobal) startAutoScroll();
        }

        initializeSlider(); // Initialize slider on DOMContentLoaded

        // --- Modal Logic ---
        const modal = document.getElementById('projectModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalImage = document.getElementById('modalImage');
        const modalDescription = document.getElementById('modalDescription');
        const modalTools = document.getElementById('modalTools');
        const closeModalButton = document.getElementById('closeModal');
        const closeModalButton2 = document.getElementById('closeModalButton');

        if (projectSliderInner) {
            projectSliderInner.addEventListener('click', function(event) {
                const button = event.target.closest('.open-modal-button');
                if (button) {
                    const projectId = button.dataset.projectId;
                    // Cari proyek dari projectsData yang di-fetch
                    const project = projectsData.find(p => p.id === projectId); 
                    if (project) {
                        isModalOpenGlobal = true;
                        stopAutoScroll();
                        modalTitle.textContent = project.title;
                        // Pastikan path gambar benar
                        const imageUrl = project.image.startsWith('/') ? project.image : `/${project.image}`;
                        modalImage.src = imageUrl;
                        modalImage.alt = `Foto Detail ${project.title}`;
                        modalDescription.innerHTML = project.longDescription.replace(/\n/g, '<br>');
                        modalTools.innerHTML = '';
                        project.tools.forEach(tool => {
                            const li = document.createElement('li');
                            li.textContent = tool;
                            modalTools.appendChild(li);
                        });
                        modal.classList.remove('opacity-0', 'invisible');
                        modal.classList.add('opacity-100', 'visible');
                        document.body.style.overflow = 'hidden';
                        if(modal.querySelector('.modal-content')) {
                           modal.querySelector('.modal-content').classList.remove('scale-95');
                           modal.querySelector('.modal-content').classList.add('scale-100');
                        }
                    }
                }
            });
        }
        // ... (sisa kode modal, menu mobile, smooth scroll, footer year, resize handler TETAP SAMA seperti sebelumnya, pastikan mereka ada di sini) ...
        // Sisa kode (modal, menu, scroll, footer, resize)
        function closeModalAndResumeInteraction() {
            isModalOpenGlobal = false;
            if (modal) {
                modal.classList.add('opacity-0');
                if(modal.querySelector('.modal-content')) {
                    modal.querySelector('.modal-content').classList.add('scale-95');
                    modal.querySelector('.modal-content').classList.remove('scale-100');
                }
                setTimeout(() => {
                    modal.classList.add('invisible');
                    modal.classList.remove('visible', 'opacity-100');
                    document.body.style.overflow = 'auto';
                    if (!isHoveringSlider) startAutoScroll();
                }, 300);
            }
        }

        if(closeModalButton) closeModalButton.addEventListener('click', closeModalAndResumeInteraction);
        if(closeModalButton2) closeModalButton2.addEventListener('click', closeModalAndResumeInteraction);
        if(modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) closeModalAndResumeInteraction();
            });
        }
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal && modal.classList.contains('visible')) {
                closeModalAndResumeInteraction();
            }
        });

        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) { targetElement.scrollIntoView({ behavior: 'smooth' }); }
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) { mobileMenu.classList.add('hidden');}
            });
        });
        
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) { currentYearElement.textContent = new Date().getFullYear(); }
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            stopAutoScroll(); 
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                calculateCardWidthAndSetup();
                if (numOriginalProjects > 1 && projectCardWidth > 0) {
                    currentActualDomIndex = numPrependedClones + currentLogicalIndex;
                    updateSliderPosition(currentActualDomIndex, false); 
                    updateActiveCardHighlight();
                } else if (numOriginalProjects === 1 && projectSliderInner && projectSliderInner.firstChild) {
                    // No complex positioning, but width might need recalc for single item
                } else if (projectCardWidth <= 0 && numOriginalProjects > 0) {
                    // console.warn("Card width is zero on resize.");
                }
                if (!isHoveringSlider && !isModalOpenGlobal) { startAutoScroll(); }
            }, 250);
        });
        // Akhir dari sisa kode
    });
    