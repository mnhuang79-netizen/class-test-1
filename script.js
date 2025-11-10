// 应用状态管理
const appState = {
    currentUser: {
        studentId: '',
        className: '',
        answers: [],
        score: 0,
        submitTime: ''
    },
    questions: [], // 题目数据将在初始化时加载
    testData: [], // 存储所有用户的测试数据
    currentQuestion: 0, // 当前题目索引
    charts: {
        correctRateChart: null,
        classAvgChart: null,
        errorDistChart: null
    }
};

// DOM元素引用
const dom = {
    // 模块容器
    loginModule: document.getElementById('loginModule'),
    testModule: document.getElementById('testModule'),
    statisticsModule: document.getElementById('statisticsModule'),
    visualizationModule: document.getElementById('visualizationModule'),
    
    // 登录模块元素
    studentIdInput: document.getElementById('studentId'),
    classNameInput: document.getElementById('className'),
    startTestBtn: document.getElementById('startTestBtn'),
    
    // 测试模块元素
    questionTitle: document.getElementById('questionTitle'),
    questionText: document.getElementById('questionText'),
    optionBtns: Array.from(document.getElementsByClassName('option-btn')),
    feedback: document.getElementById('feedback'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    
    // 得分弹窗元素
    scoreModal: document.getElementById('scoreModal'),
    scoreText: document.getElementById('scoreText'),
    viewStatsBtn: document.getElementById('viewStatsBtn'),
    
    // 统计模块元素
    classFilter: document.getElementById('classFilter'),
    exportBtn: document.getElementById('exportBtn'),
    totalStudents: document.getElementById('totalStudents'),
    averageScore: document.getElementById('averageScore'),
    highestScore: document.getElementById('highestScore'),
    lowestScore: document.getElementById('lowestScore'),
    
    // 可视化模块元素
    improvementText: document.getElementById('improvementText'),
    correctRateChart: document.getElementById('correctRateChart'),
    classAvgChart: document.getElementById('classAvgChart'),
    errorDistChart: document.getElementById('errorDistChart'),
    downloadRateChart: document.getElementById('downloadRateChart'),
    downloadAvgChart: document.getElementById('downloadAvgChart'),
    downloadDistChart: document.getElementById('downloadDistChart'),
    
    // 导航按钮
    navTest: document.getElementById('navTest'),
    navStats: document.getElementById('navStats'),
    navVisual: document.getElementById('navVisual')
};

// 初始化应用
function initApp() {
    // 从本地存储加载数据
    loadTestDataFromLocalStorage();
    loadQuestions();
    
    // 初始化模块
    initLoginModule();
    initTestModule();
    initStatisticsModule();
    initVisualizationModule();
    
    // 初始化导航
    initNavigation();
    
    // 默认显示登录模块
    switchToModule('login');
}

// 1. 登录模块功能
function initLoginModule() {
    dom.startTestBtn.addEventListener('click', () => {
        const studentId = dom.studentIdInput.value.trim();
        const className = dom.classNameInput.value.trim();
        
        if (!studentId || !className) {
            alert('Please enter both Student ID and Class!');
            return;
        }
        
        // 初始化当前用户
        appState.currentUser = {
            studentId,
            className,
            answers: new Array(appState.questions.length).fill(null),
            score: 0,
            submitTime: ''
        };
        
        // 切换到测试模块
        appState.currentQuestion = 0;
        loadCurrentQuestion();
        switchToModule('test');
    });
}

// 2. 导航功能
function initNavigation() {
    dom.navTest.addEventListener('click', () => {
        if (appState.currentUser.studentId) {
            switchToModule('test');
        } else {
            switchToModule('login');
        }
    });
    
    dom.navStats.addEventListener('click', () => switchToModule('statistics'));
    dom.navVisual.addEventListener('click', () => switchToModule('visualization'));
}

// 切换模块显示
function switchToModule(moduleName) {
    // 隐藏所有模块
    ['login', 'test', 'statistics', 'visualization'].forEach(module => {
        dom[`${module}Module`].style.display = 'none';
    });
    
    // 显示目标模块
    dom[`${moduleName}Module`].style.display = 'block';
    
    // 更新可视化数据（如果切换到可视化模块）
    if (moduleName === 'visualization') {
        updateVisualizationModule();
    }
}

// 3. 测试模块功能
function initTestModule() {
    // 选项按钮点击事件
    dom.optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isCorrectOption = btn.getAttribute('data-answer') === 'true';
            // 保存答案
            appState.currentUser.answers[appState.currentQuestion] = isCorrectOption;
            // 更新UI
            loadCurrentQuestion();
        });
    });
    
    // 上一题按钮
    dom.prevBtn.addEventListener('click', () => {
        if (appState.currentQuestion > 0) {
            appState.currentQuestion--;
            loadCurrentQuestion();
        }
    });
    
    // 下一题/提交按钮
    dom.nextBtn.addEventListener('click', () => {
        // 检查当前题是否已回答
        if (appState.currentUser.answers[appState.currentQuestion] === null) {
            alert('Please select an answer before proceeding!');
            return;
        }
        
        if (appState.currentQuestion < appState.questions.length - 1) {
            appState.currentQuestion++;
            loadCurrentQuestion();
        } else {
            // 最后一题，提交测试
            submitTest();
        }
    });
    
    // 得分弹窗：查看统计按钮
    dom.viewStatsBtn.addEventListener('click', () => {
        dom.scoreModal.style.display = 'none';
        switchToModule('statistics');
    });
}

// 加载当前题目内容
function loadCurrentQuestion() {
    const currentQ = appState.questions[appState.currentQuestion];
    // 更新题目标题和内容
    dom.questionTitle.textContent = `Question ${appState.currentQuestion + 1}/${appState.questions.length}`;
    dom.questionText.textContent = currentQ.text;
    
    // 重置选项和解析
    dom.optionBtns.forEach(btn => {
        btn.classList.remove('selected');
        // 恢复已选答案（如果有）
        const btnAnswer = btn.getAttribute('data-answer') === 'true';
        if (appState.currentUser.answers[appState.currentQuestion] === btnAnswer) {
            btn.classList.add('selected');
        }
    });
    
    // 显示解析（如果已选答案）
    dom.feedback.textContent = appState.currentUser.answers[appState.currentQuestion] !== null 
        ? currentQ.feedback 
        : '';
    
    // 更新按钮状态
    dom.prevBtn.disabled = appState.currentQuestion === 0;
    dom.nextBtn.textContent = appState.currentQuestion === appState.questions.length - 1 
        ? 'Submit Test' 
        : 'Next Question';
}

// 提交测试（计算得分并保存数据）
function submitTest() {
    // 计算得分
    let correctCount = 0;
    appState.currentUser.answers.forEach((answer, index) => {
        if (answer === appState.questions[index].correctAnswer) {
            correctCount++;
        }
    });
    appState.currentUser.score = correctCount;
    appState.currentUser.submitTime = new Date().toLocaleString();
    
    // 更新测试数据（覆盖或新增）
    const userIndex = appState.testData.findIndex(u => u.studentId === appState.currentUser.studentId);
    if (userIndex > -1) {
        appState.testData[userIndex] = appState.currentUser;
    } else {
        appState.testData.push(appState.currentUser);
    }
    
    // 保存数据并显示得分弹窗
    saveTestDataToLocalStorage();
    dom.scoreText.textContent = `You scored ${correctCount}/${appState.questions.length}!`;
    dom.scoreModal.style.display = 'flex';
}

// 4. 数据存储功能
function saveTestDataToLocalStorage() {
    localStorage.setItem('aidsTestData', JSON.stringify(appState.testData));
    // 更新班级筛选选项
    updateClassFilterOptions();
}

function loadTestDataFromLocalStorage() {
    const savedData = localStorage.getItem('aidsTestData');
    appState.testData = savedData ? JSON.parse(savedData) : [];
    updateClassFilterOptions();
}

// 加载题目数据
function loadQuestions() {
    // 这里可以替换为从API加载题目
    appState.questions = [
        {
            text: "HIV is the virus that causes AIDS.",
            correctAnswer: true,
            feedback: "Correct! HIV (Human Immunodeficiency Virus) is the virus that causes AIDS (Acquired Immunodeficiency Syndrome)."
        },
        {
            text: "There is currently a vaccine available to prevent HIV infection.",
            correctAnswer: false,
            feedback: "Correct! There is no currently available vaccine to prevent HIV infection, but there are effective prevention methods."
        },
        // 可以添加更多题目...
    ];
}

// 5. 统计模块功能
function initStatisticsModule() {
    // 导出Excel按钮
    dom.exportBtn.addEventListener('click', exportTestDataToExcel);
    
    // 班级筛选下拉框变化
    dom.classFilter.addEventListener('change', updateStatisticsModule);
    
    // 初始加载统计数据
    updateStatisticsModule();
}

// 更新班级筛选下拉框选项
function updateClassFilterOptions() {
    // 获取所有不重复的班级名称
    const classNames = [...new Set(appState.testData.map(user => user.className))].sort();
    // 清空现有选项（保留"All Classes"）
    while (dom.classFilter.options.length > 1) {
        dom.classFilter.remove(1);
    }
    // 添加班级选项
    classNames.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        dom.classFilter.appendChild(option);
    });
}

// 更新统计模块数据
function updateStatisticsModule() {
    const selectedClass = dom.classFilter.value;
    // 筛选当前班级的数据（或全部）
    const filteredData = selectedClass === 'all' 
        ? appState.testData 
        : appState.testData.filter(user => user.className === selectedClass);
    
    const total = filteredData.length;
    if (total === 0) {
        // 无数据时重置统计
        dom.totalStudents.textContent = '0';
        dom.averageScore.textContent = '0.0';
        dom.highestScore.textContent = '0';
        dom.lowestScore.textContent = '0';
        return;
    }
    
    // 计算统计指标
    const totalScores = filteredData.reduce((sum, user) => sum + user.score, 0);
    const average = (totalScores / total).toFixed(1);
    const highest = Math.max(...filteredData.map(user => user.score));
    const lowest = Math.min(...filteredData.map(user => user.score));
    
    // 更新UI
    dom.totalStudents.textContent = total;
    dom.averageScore.textContent = average;
    dom.highestScore.textContent = highest;
    dom.lowestScore.textContent = lowest;
}

// 导出数据到Excel
function exportTestDataToExcel() {
    const selectedClass = dom.classFilter.value;
    const filteredData = selectedClass === 'all' 
        ? appState.testData 
        : appState.testData.filter(user => user.className === selectedClass);
    
    if (filteredData.length === 0) {
        alert('No data to export!');
        return;
    }
    
    // 准备Excel数据结构
    const excelData = [
        ['Class', 'Student ID', 'Score', 'Total Questions', 'Submit Time'] // 表头
    ];
    // 填充学生数据
    filteredData.forEach(user => {
        excelData.push([
            user.className,
            user.studentId,
            user.score,
            appState.questions.length,
            user.submitTime
        ]);
    });
    
    // 生成Excel文件
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AIDS Test Data');
    
    // 下载文件（按班级命名）
    const fileName = selectedClass === 'all' 
        ? `AIDS_Test_All_Classes_${new Date().toLocaleDateString()}.xlsx`
        : `AIDS_Test_${selectedClass}_${new Date().toLocaleDateString()}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    alert('Data exported successfully!');
}

// 6. 可视化与分析模块功能
function initVisualizationModule() {
    // 初始化图表
    updateVisualizationModule();
    
    // 图表下载按钮
    dom.downloadRateChart.addEventListener('click', () => downloadChart(dom.correctRateChart, 'question_correct_rate.png'));
    dom.downloadAvgChart.addEventListener('click', () => downloadChart(dom.classAvgChart, 'class_average_score.png'));
    dom.downloadDistChart.addEventListener('click', () => downloadChart(dom.errorDistChart, 'incorrect_answers_distribution.png'));
}

// 更新可视化模块（图表+答案分析）
function updateVisualizationModule() {
    const selectedClass = dom.classFilter.value;
    const filteredData = selectedClass === 'all' 
        ? appState.testData 
        : appState.testData.filter(user => user.className === selectedClass);
    
    if (filteredData.length === 0) {
        dom.improvementText.textContent = 'No test data yet. Please have students complete the test first.';
        // 清空图表
        clearAllCharts();
        return;
    }
    
    // 1. 更新答案分析报告
    updateImprovementAnalysis(filteredData);
    
    // 2. 更新图表
    renderCorrectRateChart(filteredData);
    renderClassAvgChart(filteredData);
    renderErrorDistChart(filteredData);
}

// 生成答案分析报告（薄弱知识点）
function updateImprovementAnalysis(filteredData) {
    const totalStudents = filteredData.length;
    const lowRateQuestions = []; // 正确率低于60%的题目
    
    // 计算每道题的正确率
    appState.questions.forEach((q, index) => {
        const correctCount = filteredData.reduce((sum, user) => {
            return user.answers[index] === q.correctAnswer ? sum + 1 : sum;
        }, 0);
        const correctRate = (correctCount / totalStudents) * 100;
        
        if (correctRate < 60) {
            // 记录薄弱知识点
            const topic = getQuestionTopic(index);
            lowRateQuestions.push(`Question ${index + 1} (${correctRate.toFixed(1)}% correct) - ${topic}`);
        }
    });
    
    // 更新分析文本
    if (lowRateQuestions.length === 0) {
        dom.improvementText.textContent = 'Great! All questions have a correct rate above 60%. Students have a good understanding of AIDS knowledge.';
    } else {
        dom.improvementText.textContent = `Need more practice on: \n${lowRateQuestions.join('\n')}`;
    }
}

// 获取题目对应的知识点（用于分析报告）
function getQuestionTopic(questionIndex) {
    const topics = [
        'HIV basic knowledge (cause of AIDS & risk groups)',
        'HIV vaccine availability',
        'HIV detection window period',
        'HIV transmission via body fluids',
        'HIV transmission via casual contact',
        'HIV transmission via animals/insects'
    ];
    return topics[questionIndex];
}

// 渲染「单题正确率柱状图」
function renderCorrectRateChart(filteredData) {
    const totalStudents = filteredData.length;
    // 计算每道题的正确率
    const correctRates = appState.questions.map((q, index) => {
        const correctCount = filteredData.reduce((sum, user) => {
            return user.answers[index] === q.correctAnswer ? sum + 1 : sum;
        }, 0);
        return Math.round((correctCount / totalStudents) * 100);
    });
    
    // 销毁旧图表（避免重复渲染）
    if (appState.charts.correctRateChart) {
        appState.charts.correctRateChart.destroy();
    }
    
    // 创建新图表
    appState.charts.correctRateChart = new Chart(dom.correctRateChart, {
        type: 'bar',
        data: {
            labels: appState.questions.map((_, i) => `Q${i + 1}`),
            datasets: [{
                label: 'Correct Rate (%)',
                data: correctRates,
                backgroundColor: 'rgba(30, 144, 255, 0.7)',
                borderColor: 'rgba(30, 144, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Correct Rate (%)' }
                },
                x: {
                    title: { display: true, text: 'Question Number' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `Correct Rate: ${context.raw}%`
                    }
                }
            }
        }
    });
}

// 渲染「班级平均分条形图」
function renderClassAvgChart(filteredData) {
    // 按班级分组计算平均分
    const classScores = {};
    filteredData.forEach(user => {
        if (!classScores[user.className]) {
            classScores[user.className] = { total: 0, count: 0 };
        }
        classScores[user.className].total += user.score;
        classScores[user.className].count++;
    });
    
    // 准备图表数据
    const classNames = Object.keys(classScores);
    const avgScores = classNames.map(cls => {
        return (classScores[cls].total / classScores[cls].count).toFixed(1);
    });
    
    // 销毁旧图表
    if (appState.charts.classAvgChart) {
        appState.charts.classAvgChart.destroy();
    }
    
    // 创建新图表
    appState.charts.classAvgChart = new Chart(dom.classAvgChart, {
        type: 'bar',
        data: {
            labels: classNames,
            datasets: [{
                label: 'Average Score',
                data: avgScores,
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: appState.questions.length,
                    title: { display: true, text: `Average Score (0-${appState.questions.length})` }
                },
                x: {
                    title: { display: true, text: 'Class' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `Average Score: ${context.raw}`
                    }
                }
            }
        }
    });
}

// 渲染「错误分布饼图」
function renderErrorDistChart(filteredData) {
    // 计算每道题的错误次数
    const errorCounts = appState.questions.map((q, index) => {
        return filteredData.reduce((sum, user) => {
            return user.answers[index] !== q.correctAnswer ? sum + 1 : sum;
        }, 0);
    });
    
    // 过滤无错误的题目（不显示在饼图中）
    const labels = [];
    const data = [];
    const colors = [];
    errorCounts.forEach((count, index) => {
        if (count > 0) {
            labels.push(`Q${index + 1}`);
            data.push(count);
            // 生成随机颜色（区分不同题目）
            colors.push(`rgba(${Math.floor(Math.random() * 200) + 50}, ${Math.floor(Math.random() * 200) + 50}, ${Math.floor(Math.random() * 200) + 50}, 0.7)`);
        }
    });
    
    // 销毁旧图表
    if (appState.charts.errorDistChart) {
        appState.charts.errorDistChart.destroy();
    }
    
    // 创建新图表（无错误数据时显示提示）
    if (data.length === 0) {
        appState.charts.errorDistChart = new Chart(dom.errorDistChart, {
            type: 'pie',
            data: {
                labels: ['No Incorrect Answers'],
                datasets: [{ data: [1], backgroundColor: ['#ccc'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false }
                }
            }
        });
    } else {
        appState.charts.errorDistChart = new Chart(dom.errorDistChart, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `Q${context.label.slice(1)}: ${context.raw} incorrect`
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            callbacks: {
                                label: (context) => {
                                    const total = data.reduce((sum, val) => sum + val, 0);
                                    const percentage = Math.round((context.raw / total) * 100);
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}

// 清空所有图表
function clearAllCharts() {
    Object.values(appState.charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    appState.charts = { correctRateChart: null, classAvgChart: null, errorDistChart: null };
}

// 下载图表为图片
function downloadChart(chartCanvas, fileName) {
    try {
        // 转换图表为图片URL
        const imageURL = chartCanvas.toDataURL('image/png');
        // 创建下载链接
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = fileName;
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(`Chart downloaded as ${fileName}!`);
    } catch (error) {
        alert('Failed to download chart. Please try again!');
        console.error('Chart download error:', error);
    }
}

// 页面加载完成后初始化应用
window.addEventListener('load', initApp);
