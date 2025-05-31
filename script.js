document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GOOGLE_SHEET_CSV_URLS = {
        masterQuizData: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQU0g3trsuzht1k41hLH_ZUDFSYJAv-ErkUVjAgXypbNa1OCK8txN3pIL2h79ZFDfs1Uav35ijkc_w-/pub?output=csv', // !!! REPLACE THIS !!!
        questionData: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRh4YmhmWCfWkYwLFVUpygYgmy_NHU9VxWXLwqjABpvGzEmOaUU5vzYn0kcpakMQhs96MmG4DIuZM1x/pub?output=csv'     // !!! REPLACE THIS !!!
    };
    const LOCAL_STORAGE_STUDENT_ID_KEY = 'satHubStudentGmailId'; // Use Gmail ID

    // --- DOM ELEMENTS ---
    const studentIdInputContainerEl = document.getElementById('student-id-input-container');
    const studentIdInputEl = document.getElementById('studentIdInput');
    const loadDataButtonEl = document.getElementById('loadDataButton');
    const idInputErrorEl = document.getElementById('id-input-error');
    const loadingMessageEl = document.getElementById('loading-message');
    const errorMessageEl = document.getElementById('error-message');
    const noDataMessageEl = document.getElementById('no-data-message');
    const dashboardRootContainerEl = document.getElementById('dashboard-root-container');
    const dashboardStudentNameEl = document.getElementById('dashboard-student-name');
    const changeIdButtonEl = document.getElementById('changeIdButton');
    const retryIdButtonEl = document.getElementById('retryIdButton');

    const overviewCardsContainerEl = document.getElementById('overview-cards-container');
    const scoreTrendChartEl = document.getElementById('scoreTrendChart');
    const skillPerformanceChartEl = document.getElementById('skillPerformanceChart');
    const strengthsListEl = document.getElementById('strengths-list');
    const weaknessesListEl = document.getElementById('weaknesses-list');
    
    const practiceTestsTableBodyEl = document.getElementById('practiceTests-table-body');
    const canvasKhanQuizzesTableBodyEl = document.getElementById('canvas-khan-quizzes-table-body');
    const detailedSkillAnalysisContainerEl = document.getElementById('detailed-skill-analysis-container');
    
    const currentYearEl = document.getElementById('current-year');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Chart instances
    let scoreTrendChartInstance = null;
    let skillPerformanceChartInstance = null;

    // --- GLOBAL DATA ---
    let allMasterQuizData = [];
    let allQuestionData = [];
    let currentStudentData = {
        masterQuizzes: [],
        questions: [],
        profile: {}
    };

    // --- ICON SVGs ---
    const icons = {
        overallScore: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
        verbal: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`, // Heart, can be changed
        math: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M12 11h.01M15 11h.01M9 4h6a2 2 0 012 2v12a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2z"></path></svg>`, // Calculator
        avgQuiz: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        checkCircle: `<svg class="w-5 h-5 mr-2 inline text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        xCircle: `<svg class="w-5 h-5 mr-2 inline text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        barchart2: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>` // Pie chart for skills
    };

    // --- HELPER FUNCTIONS ---
    const formatDate = (dateString) => {
        if (!dateString || dateString.toLowerCase() === "n/a") return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return dateString; }
    };

    function getStudentGmailFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('studentGmailId');
    }

    function parseCSVWithPapaParse(csvText, callback) {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                callback(results.data);
            },
            error: (error) => {
                console.error("PapaParse Error:", error);
                callback([]); // Return empty array on error
            }
        });
    }
    
    // --- UI MANAGEMENT ---
    function showLoadingScreen(message = "Loading student data...") {
        if(loadingMessageEl) {
            loadingMessageEl.innerHTML = `<svg class="animate-spin h-8 w-8 text-sky-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${message}`;
            loadingMessageEl.classList.remove('hidden');
        }
        if(studentIdInputContainerEl) studentIdInputContainerEl.classList.add('hidden');
        if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
        if(errorMessageEl) errorMessageEl.classList.add('hidden');
        if(noDataMessageEl) noDataMessageEl.classList.add('hidden');
    }

    function showInputScreen(errorMessage = "") {
        if(studentIdInputContainerEl) studentIdInputContainerEl.classList.remove('hidden');
        if(loadingMessageEl) loadingMessageEl.classList.add('hidden');
        if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
        if(errorMessageEl) errorMessageEl.classList.add('hidden');
        if(noDataMessageEl) noDataMessageEl.classList.add('hidden');
        if (errorMessage && idInputErrorEl) {
            idInputErrorEl.textContent = errorMessage;
            idInputErrorEl.classList.remove('hidden');
        } else if (idInputErrorEl) {
            idInputErrorEl.classList.add('hidden');
        }
        if(studentIdInputEl) {
            studentIdInputEl.value = ""; 
            studentIdInputEl.focus();
        }
    }
    
    function displayError(message) { 
        showLoadingScreen(); // Basic reset
        if(errorMessageEl) {
            errorMessageEl.textContent = message;
            errorMessageEl.classList.remove('hidden');
        }
        if(studentIdInputContainerEl) studentIdInputContainerEl.classList.add('hidden'); 
        if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    }

    function displayNoDataFoundScreen() {
        showLoadingScreen(); 
        if(noDataMessageEl) noDataMessageEl.classList.remove('hidden');
        if(studentIdInputContainerEl) studentIdInputContainerEl.classList.add('hidden'); 
        if(dashboardRootContainerEl) dashboardRootContainerEl.classList.add('hidden');
    }

    // --- DATA PROCESSING AND RENDERING ---
    function processStudentData(studentGmailId) {
        const masterQuizzes = allMasterQuizData.filter(row => row.StudentGmailID === studentGmailId);
        const questions = allQuestionData.filter(row => row.StudentGmailID === studentGmailId);
        
        let studentName = "Student"; // Default
        if (masterQuizzes.length > 0) {
             // Try to get name from Canvas data first if available, otherwise from Khan
            const canvasEntry = allMasterQuizData.find(row => row.StudentGmailID === studentGmailId && row.Source === 'Canvas' && row.StudentName);
            if (canvasEntry) studentName = canvasEntry.StudentName;
            // else if (allMasterQuizData.find(row => row.StudentGmailID === studentGmailId && row.StudentName)) {
            //     studentName = allMasterQuizData.find(row => row.StudentGmailID === studentGmailId && row.StudentName).StudentName;
            // }
        } else if (questions.length > 0 && questions[0].StudentName) {
            studentName = questions[0].StudentName;
        }


        currentStudentData = {
            masterQuizzes: masterQuizzes,
            questions: questions,
            profile: {
                gmailId: studentGmailId,
                name: studentName
            }
        };

        if (masterQuizzes.length === 0 && questions.length === 0) {
            displayNoDataFoundScreen();
            return false;
        }
        return true;
    }
    
    function renderDashboard() {
        if (!currentStudentData || (!currentStudentData.masterQuizzes.length && !currentStudentData.questions.length)) {
            displayNoDataFoundScreen();
            return;
        }

        if(dashboardRootContainerEl) dashboardRootContainerEl.classList.remove('hidden');
        if(studentIdInputContainerEl) studentIdInputContainerEl.classList.add('hidden');
        if(loadingMessageEl) loadingMessageEl.classList.add('hidden');
        if(errorMessageEl) errorMessageEl.classList.add('hidden');
        if(noDataMessageEl) noDataMessageEl.classList.add('hidden');

        if(dashboardStudentNameEl) dashboardStudentNameEl.textContent = `Welcome, ${currentStudentData.profile.name}!`;
        
        renderOverviewCards();
        renderScoreTrendChart();
        renderSkillPerformanceChart();
        renderStrengthsWeaknesses();
        renderPracticeTestsTable();
        renderCanvasKhanQuizzesTable();
        renderDetailedSkillAnalysis();

        if(currentYearEl) currentYearEl.textContent = new Date().getFullYear();
        setupTabs(); // Ensure tabs are set up after content is ready
    }

    function renderOverviewCards() {
        if (!overviewCardsContainerEl || !currentStudentData) return;

        const practiceTests = currentStudentData.masterQuizzes.filter(q => q.Source === 'Canvas' && q.QuizID === 'CB1');
        const latestPracticeTest = practiceTests.sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn))[0];
        
        const allQuizzes = currentStudentData.masterQuizzes.filter(q => q.Source === 'Canvas' && q.QuizID !== 'CB1' || q.Source === 'Khan Academy');
        let avgQuizScore = 0;
        if (allQuizzes.length > 0) {
            const totalScore = allQuizzes.reduce((sum, q) => {
                let score = parseFloat(q.Score);
                let possible = parseFloat(q.PointsPossible);
                if (String(q.Score).includes('%')) { // Handle Khan scores like "80%"
                    score = parseFloat(q.Score.replace('%',''));
                    possible = 100;
                }
                return sum + (isNaN(score) || isNaN(possible) || possible === 0 ? 0 : (score / possible));
            }, 0);
            avgQuizScore = Math.round((totalScore / allQuizzes.length) * 100);
        }
        
        const cards = [
            { id: 'overallScore', title: 'Latest SAT Practice Score', value: latestPracticeTest ? latestPracticeTest.Score : 'N/A', sub: latestPracticeTest ? `/ ${latestPracticeTest.PointsPossible}` : '', icon: icons.overallScore, color: 'text-sky-600' },
            { id: 'verbalScore', title: 'Latest Verbal Score', value: latestPracticeTest ? latestPracticeTest.VerbalScore : 'N/A', sub: latestPracticeTest ? '/ 800' : '', icon: icons.verbal, color: 'text-indigo-600' },
            { id: 'mathScore', title: 'Latest Math Score', value: latestPracticeTest ? latestPracticeTest.MathScore : 'N/A', sub: latestPracticeTest ? '/ 800' : '', icon: icons.math, color: 'text-teal-600' },
            { id: 'avgQuizScore', title: 'Average Quiz Score', value: `${avgQuizScore}%`, sub: `(${allQuizzes.length} quizzes)`, icon: icons.avgQuiz, color: 'text-amber-600' }
        ];
        overviewCardsContainerEl.innerHTML = cards.map(card => `
            <div class="sathub-card p-4 md:p-6 flex items-center space-x-4">
                <div class="p-3 rounded-full bg-sky-100 ${card.color}">${card.icon}</div>
                <div>
                    <p class="text-sm text-slate-500">${card.title}</p>
                    <p class="text-2xl font-bold ${card.color}">${card.value} <span class="text-base font-normal">${card.sub || ''}</span></p>
                </div>
            </div>
        `).join('');
    }

    function renderScoreTrendChart() {
        if (!scoreTrendChartEl || typeof Chart === 'undefined' || !currentStudentData) return;
        const practiceTests = currentStudentData.masterQuizzes
            .filter(q => q.Source === 'Canvas' && q.QuizID === 'CB1') // Only official practice tests
            .sort((a, b) => new Date(a.AttemptedOn) - new Date(b.AttemptedOn));

        if (practiceTests.length === 0) {
            scoreTrendChartEl.parentElement.innerHTML = "<p class='text-slate-500 text-center py-10'>No official practice test data available for trend.</p>";
            return;
        }

        const labels = practiceTests.map(t => `${t.QuizName} (${formatDate(t.AttemptedOn)})`);
        const totalScores = practiceTests.map(t => parseFloat(t.Score));
        const verbalScores = practiceTests.map(t => parseFloat(t.VerbalScore));
        const mathScores = practiceTests.map(t => parseFloat(t.MathScore));

        if (scoreTrendChartInstance) scoreTrendChartInstance.destroy();
        scoreTrendChartInstance = new Chart(scoreTrendChartEl.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Total Score', data: totalScores, borderColor: '#003366', backgroundColor: 'rgba(0, 51, 102, 0.1)', fill: false, tension: 0.1, borderWidth: 2 },
                    { label: 'Verbal Score', data: verbalScores, borderColor: '#00AEEF', backgroundColor: 'rgba(0, 174, 239, 0.1)', fill: false, tension: 0.1, borderWidth: 2, hidden: true },
                    { label: 'Math Score', data: mathScores, borderColor: '#7DD3FC', backgroundColor: 'rgba(125, 211, 252, 0.1)', fill: false, tension: 0.1, borderWidth: 2, hidden: true }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, min: 400, max: 1600 } } }
        });
    }

    function renderSkillPerformanceChart() {
        if (!skillPerformanceChartEl || typeof Chart === 'undefined' || !currentStudentData) return;
        const skillData = {}; // { "Skill Name": { correct: 0, total: 0 }, ... }

        currentStudentData.questions.forEach(q => {
            const skill = q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' ? q.SAT_Skill_Tag : "Uncategorized";
            if (!skillData[skill]) skillData[skill] = { correct: 0, total: 0 };
            skillData[skill].total++;
            if (q.IsCorrect_Question === 'TRUE' || q.IsCorrect_Question === true) {
                skillData[skill].correct++;
            }
        });
        
        // Also incorporate broader skills from outcomes in masterQuizData if they exist
        currentStudentData.masterQuizzes.forEach(q => {
            if (q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' && q.SAT_Skill_Tag !== 'Full Test') {
                 // Avoid double counting if already processed via questions; this is more for Khan/overall tags
                if (!skillData[q.SAT_Skill_Tag] && q.Score && q.PointsPossible) { // Only add if not already detailed by questions
                    skillData[q.SAT_Skill_Tag] = { correct: 0, total: 0, isAggregated: true };
                    let score = parseFloat(q.Score);
                    let possible = parseFloat(q.PointsPossible);
                     if (String(q.Score).includes('%')) { // Handle Khan scores like "80%"
                        score = parseFloat(q.Score.replace('%',''));
                        possible = 100;
                    }
                    if (!isNaN(score) && !isNaN(possible) && possible > 0) {
                         skillData[q.SAT_Skill_Tag].correct = score; // Use score directly
                         skillData[q.SAT_Skill_Tag].total = possible; // Use possible as total
                    }
                }
            }
        });


        const labels = Object.keys(skillData);
        if (labels.length === 0) {
            skillPerformanceChartEl.parentElement.innerHTML = "<p class='text-slate-500 text-center py-10'>Not enough skill data available for chart.</p>";
            return;
        }
        const accuracyData = labels.map(skill => skillData[skill].total > 0 ? (skillData[skill].correct / skillData[skill].total) * 100 : 0);

        if (skillPerformanceChartInstance) skillPerformanceChartInstance.destroy();
        skillPerformanceChartInstance = new Chart(skillPerformanceChartEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Accuracy (%)',
                    data: accuracyData,
                    backgroundColor: labels.map((_, i) => i % 2 === 0 ? 'rgba(0, 174, 239, 0.7)' : 'rgba(0, 51, 102, 0.7)'),
                    borderColor: labels.map((_, i) => i % 2 === 0 ? '#00AEEF' : '#003366'),
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, max: 100 } } }
        });
    }

    function renderStrengthsWeaknesses() {
        if (!currentStudentData || (!strengthsListEl && !weaknessesListEl)) return;

        const skillPerformance = {};
        currentStudentData.questions.forEach(q => {
            const skill = q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' ? q.SAT_Skill_Tag : null;
            if (!skill) return;
            if (!skillPerformance[skill]) skillPerformance[skill] = { correct: 0, total: 0 };
            skillPerformance[skill].total++;
             if (q.IsCorrect_Question === 'TRUE' || q.IsCorrect_Question === true) skillPerformance[skill].correct++;
        });
        
        // Add aggregated skills from masterQuizData too
        currentStudentData.masterQuizzes.forEach(q => {
            const skill = q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' && q.SAT_Skill_Tag !== 'Full Test' ? q.SAT_Skill_Tag : null;
            if (!skill) return;
            if (!skillPerformance[skill] && q.Score && q.PointsPossible) { // Only if not detailed by questions
                 let score = parseFloat(q.Score);
                 let possible = parseFloat(q.PointsPossible);
                 if (String(q.Score).includes('%')) {
                    score = parseFloat(q.Score.replace('%',''));
                    possible = 100;
                 }
                 if (!isNaN(score) && !isNaN(possible) && possible > 0) {
                    skillPerformance[skill] = { correct: score, total: possible };
                 }
            }
        });


        const sortedSkills = Object.entries(skillPerformance)
            .map(([skill, data]) => ({ skill, accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0, totalQuestions: data.total }))
            .filter(s => s.totalQuestions > 0) // Consider skills with some questions
            .sort((a, b) => b.accuracy - a.accuracy);

        const strengths = sortedSkills.filter(s => s.accuracy >= 80 && s.totalQuestions >=2).slice(0, 5); // Top 5 strengths with >=80% and min 2 questions
        const weaknesses = sortedSkills.filter(s => s.accuracy < 60 && s.totalQuestions >=2).sort((a,b) => a.accuracy - b.accuracy).slice(0, 5); // Bottom 5 weaknesses with <60%

        if (strengthsListEl) {
            strengthsListEl.innerHTML = strengths.length > 0 ?
                strengths.map(s => `<li>${icons.checkCircle} ${s.skill} (${s.accuracy.toFixed(0)}%)</li>`).join('') :
                '<li>More data needed to identify strengths.</li>';
        }
        if (weaknessesListEl) {
            weaknessesListEl.innerHTML = weaknesses.length > 0 ?
                weaknesses.map(s => `<li>${icons.xCircle} ${s.skill} (${s.accuracy.toFixed(0)}%)</li>`).join('') :
                '<li>No specific weak areas identified currently, or more data needed.</li>';
        }
    }
    
    function renderPracticeTestsTable() {
        if (!practiceTestsTableBodyEl || !currentStudentData) return;
        const tests = currentStudentData.masterQuizzes
            .filter(q => q.Source === 'Canvas' && q.QuizID === 'CB1') // Only College Board tests
            .sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn));
            
        if (tests.length === 0) {
            practiceTestsTableBodyEl.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-slate-500">No official practice tests taken yet.</td></tr>';
            return;
        }
        practiceTestsTableBodyEl.innerHTML = tests.map(test => `
            <tr class="border-b border-slate-100 hover:bg-sky-50">
                <td class="p-3">${test.QuizName}</td>
                <td class="p-3">${formatDate(test.AttemptedOn)}</td>
                <td class="p-3">${test.VerbalScore || 'N/A'}</td>
                <td class="p-3">${test.MathScore || 'N/A'}</td>
                <td class="p-3 font-semibold sathub-accent">${test.Score || 'N/A'} / ${test.PointsPossible || '1600'}</td>
            </tr>
        `).join('');
    }

    function renderCanvasKhanQuizzesTable() {
        if (!canvasKhanQuizzesTableBodyEl || !currentStudentData) return;
        const quizzes = currentStudentData.masterQuizzes
            .filter(q => !(q.Source === 'Canvas' && q.QuizID === 'CB1')) // Exclude official practice tests
            .sort((a,b) => new Date(b.AttemptedOn) - new Date(a.AttemptedOn));

        if (quizzes.length === 0) {
            canvasKhanQuizzesTableBodyEl.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-slate-500">No quiz data available.</td></tr>';
            return;
        }
        canvasKhanQuizzesTableBodyEl.innerHTML = quizzes.map(quiz => {
            let displayScore = quiz.Score;
            if (String(quiz.Score).includes('.') && parseFloat(quiz.Score) < 2 && quiz.Source === 'Khan Academy') { // Khan % score
                displayScore = (parseFloat(quiz.Score) * 100).toFixed(0) + '%';
            } else if (quiz.Source === 'Khan Academy' && !String(quiz.Score).includes('%') && quiz.PointsPossible) {
                 displayScore = `${quiz.Score} / ${quiz.PointsPossible}`; // Raw score if not %
            } else if (quiz.Source === 'Khan Academy' && !String(quiz.Score).includes('%') && !quiz.PointsPossible) {
                 displayScore = `${quiz.Score}%`; // Assume it's a percentage if points possible is blank
            }
             else if (quiz.PointsPossible) {
                displayScore = `${quiz.Score} / ${quiz.PointsPossible}`;
            }

            return `
                <tr class="border-b border-slate-100 hover:bg-sky-50">
                    <td class="p-3">${quiz.QuizName}</td>
                    <td class="p-3">${quiz.Source}</td>
                    <td class="p-3">${formatDate(quiz.AttemptedOn)}</td>
                    <td class="p-3">${displayScore}</td>
                    <td class="p-3">${quiz.PointsPossible || (String(quiz.Score).includes('%') || (quiz.Source === 'Khan Academy' && !quiz.PointsPossible) ? '100' : 'N/A')}</td>
                </tr>
            `;
        }).join('');
    }

    function renderDetailedSkillAnalysis() {
        if (!detailedSkillAnalysisContainerEl || !currentStudentData) return;

        const skills = {}; // { "Skill Name": { questions: [], correct: 0, total: 0 } }
        currentStudentData.questions.forEach(q => {
            const skill = q.SAT_Skill_Tag && q.SAT_Skill_Tag !== 'TBD' ? q.SAT_Skill_Tag : "Uncategorized";
            if (!skills[skill]) skills[skill] = { questions: [], correct: 0, total: 0 };
            skills[skill].questions.push(q);
            skills[skill].total++;
            if (q.IsCorrect_Question === 'TRUE' || q.IsCorrect_Question === true) {
                skills[skill].correct++;
            }
        });

        if (Object.keys(skills).length === 0) {
            detailedSkillAnalysisContainerEl.innerHTML = "<p class='text-slate-500'>No detailed question data available for skill analysis.</p>";
            return;
        }

        detailedSkillAnalysisContainerEl.innerHTML = Object.entries(skills)
            .sort(([skillA], [skillB]) => skillA.localeCompare(skillB)) // Sort skills alphabetically
            .map(([skill, data]) => {
                const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                let bgColor = accuracy >= 80 ? 'bg-green-50' : accuracy >= 60 ? 'bg-yellow-50' : 'bg-red-50';
                let textColor = accuracy >= 80 ? 'text-green-700' : accuracy >= 60 ? 'text-yellow-700' : 'text-red-700';

                return `
                    <div class="sathub-card p-4 mb-4">
                        <h3 class="text-lg font-semibold ${textColor} mb-2">${skill} - ${accuracy.toFixed(0)}% Accuracy (${data.correct}/${data.total})</h3>
                        <ul class="text-sm space-y-1 list-disc list-inside pl-4 text-slate-600">
                            ${data.questions.map(q => `
                                <li class="${(q.IsCorrect_Question === 'TRUE' || q.IsCorrect_Question === true) ? 'text-green-600' : 'text-red-600'}">
                                    <strong>Q${q.QuestionID}:</strong> ${q.QuestionTitle.substring(0,80)}... 
                                    (Your answer: ${q.StudentAnswer} - ${(q.IsCorrect_Question === 'TRUE' || q.IsCorrect_Question === true) ? 'Correct' : 'Incorrect'})
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
        }).join('');
    }


    // --- TAB SWITCHING ---
    function setupTabs() {
        if (!tabButtons || !tabPanes) return;
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active', 'text-sky-600', 'border-sky-600'));
                button.classList.add('active', 'text-sky-600', 'border-sky-600');
                const targetTab = button.dataset.tab;
                tabPanes.forEach(pane => {
                    pane.id === `${targetTab}-content` ? pane.classList.remove('hidden') : pane.classList.add('hidden');
                });
                 if (targetTab === 'overview') {
                    setTimeout(() => { // Ensure canvas is visible for chart rendering/resizing
                        if (typeof Chart !== 'undefined') {
                             if (scoreTrendChartInstance && typeof scoreTrendChartInstance.resize === 'function') scoreTrendChartInstance.resize(); else renderScoreTrendChart();
                             if (skillPerformanceChartInstance && typeof skillPerformanceChartInstance.resize === 'function') skillPerformanceChartInstance.resize(); else renderSkillPerformanceChart();
                        }
                    }, 50);
                }
            });
        });
        // Activate the first tab by default
        if (tabButtons.length > 0) tabButtons[0].click(); 
    }
    
    // --- DATA FETCHING AND INITIALIZATION ---
    async function loadAndProcessData(studentGmailId) {
        if (!studentGmailId) {
            showInputScreen("Student Gmail ID is missing.");
            return;
        }
        showLoadingScreen();

        if (!GOOGLE_SHEET_CSV_URLS.masterQuizData || GOOGLE_SHEET_CSV_URLS.masterQuizData === 'URL_FOR_MASTER_QUIZ_DATA_CSV_HERE' ||
            !GOOGLE_SHEET_CSV_URLS.questionData || GOOGLE_SHEET_CSV_URLS.questionData === 'URL_FOR_QUESTION_DATA_CSV_HERE') {
            displayError("Dashboard CSV URLs are not configured. Please update script.js.");
            return;
        }

        try {
            // Fetch only if data isn't already loaded
            if (allMasterQuizData.length === 0 || allQuestionData.length === 0) {
                const [masterResponse, questionResponse] = await Promise.all([
                    fetch(GOOGLE_SHEET_CSV_URLS.masterQuizData),
                    fetch(GOOGLE_SHEET_CSV_URLS.questionData)
                ]);

                if (!masterResponse.ok) throw new Error(`Failed to fetch master quiz data: ${masterResponse.statusText}`);
                if (!questionResponse.ok) throw new Error(`Failed to fetch question data: ${questionResponse.statusText}`);

                const [masterCsvText, questionCsvText] = await Promise.all([
                    masterResponse.text(),
                    questionResponse.text()
                ]);
                
                await new Promise(resolve => parseCSVWithPapaParse(masterCsvText, data => { allMasterQuizData = data; resolve(); }));
                await new Promise(resolve => parseCSVWithPapaParse(questionCsvText, data => { allQuestionData = data; resolve(); }));
            }
            
            if (processStudentData(studentGmailId)) {
                localStorage.setItem(LOCAL_STORAGE_STUDENT_ID_KEY, studentGmailId);
                renderDashboard();
            }
            // displayNoDataFoundScreen is called by processStudentData if needed

        } catch (error) {
            console.error('Full error object in loadAndProcessData:', error);
            let displayMsg = `Error loading data: ${error.message}. Check console, CSV URLs, and ensure CSVs are published correctly.`;
            if (error.message.includes("Failed to parse URL") || error.message.includes("Invalid URL")) {
                displayMsg = "One of the Google Sheet CSV URLs seems invalid or is still a placeholder. Please check the GOOGLE_SHEET_CSV_URLS in the script.";
            }
            displayError(displayMsg);
        }
    }
    
    function clearSavedStudentIdAndPrompt() {
        localStorage.removeItem(LOCAL_STORAGE_STUDENT_ID_KEY);
        currentStudentData = { masterQuizzes: [], questions: [], profile: {} }; // Reset
        if (scoreTrendChartInstance && typeof scoreTrendChartInstance.destroy === 'function') { scoreTrendChartInstance.destroy(); scoreTrendChartInstance = null; }
        if (skillPerformanceChartInstance && typeof skillPerformanceChartInstance.destroy === 'function') { skillPerformanceChartInstance.destroy(); skillPerformanceChartInstance = null; }
        showInputScreen("Please enter your Student Gmail ID.");
    }

    // --- INITIAL PAGE LOAD LOGIC ---
    function initializePage() {
        if (!studentIdInputContainerEl || !loadDataButtonEl || !changeIdButtonEl || !retryIdButtonEl) {
            console.error("Critical UI elements for ID input or actions are missing from the HTML.");
            if(errorMessageEl) {
                errorMessageEl.textContent = "Dashboard UI is not set up correctly. Please contact support.";
                errorMessageEl.classList.remove('hidden');
            }
            return;
        }

        const studentGmailIdFromUrl = getStudentGmailFromURL(); // Use the Gmail ID specific function
        const savedStudentGmailId = localStorage.getItem(LOCAL_STORAGE_STUDENT_ID_KEY);

        let studentIdToLoad = null;
        if (studentGmailIdFromUrl) {
            studentIdToLoad = studentGmailIdFromUrl;
        } else if (savedStudentGmailId) {
            studentIdToLoad = savedStudentGmailId;
        }

        if (studentIdToLoad) {
            loadAndProcessData(studentIdToLoad);
        } else {
            showInputScreen();
        }

        loadDataButtonEl.addEventListener('click', () => {
            const enteredId = studentIdInputEl.value.trim();
            if (idInputErrorEl) idInputErrorEl.classList.add('hidden');
            if (enteredId) {
                loadAndProcessData(enteredId);
            } else if (idInputErrorEl) {
                idInputErrorEl.textContent = "Please enter your Student Gmail ID.";
                idInputErrorEl.classList.remove('hidden');
            }
        });

        changeIdButtonEl.addEventListener('click', clearSavedStudentIdAndPrompt);
        retryIdButtonEl.addEventListener('click', clearSavedStudentIdAndPrompt);
        if(barchart2IconPlaceholderEl) barchart2IconPlaceholderEl.innerHTML = icons.barchart2;
        if(document.getElementById('clock-icon-placeholder')) document.getElementById('clock-icon-placeholder').innerHTML = icons.clock; // Simplified
    }

    initializePage();
});
