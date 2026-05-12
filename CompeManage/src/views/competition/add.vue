<script setup>
import { ref, reactive, computed, renderList, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, ElTableColumn } from 'element-plus';
import { Plus, DocumentCopy, ArrowRight, Check, Delete, ArrowLeft, UploadFilled, Download, FolderOpened, Warning, CircleCheck } from '@element-plus/icons-vue';
import { debounce } from '@/utils/debounce';
import api from '@/api/index';
import * as XLSX from 'xlsx';

const router = useRouter();
const route = useRoute();
const activeTab = ref('manual');

// Tab 1 手动录入新赛事
const formRef = ref(null);
const form = reactive({
    comp_name: '', comp_level: '', comp_type: '', organizer: '',
    undertaker: '', manager: '', manager_id: '', college: '', desc: '', year: ''
});
const rules = {
    //blur: 输入框失去焦点时触发验证  change: 选择框值变化时触发验证
    comp_name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
    comp_level: [{ required: true, message: '请选择赛事级别', trigger: 'change' }],
    manager: [{ required: true, message: '请输入赛事负责人', trigger: 'change' }],
};
const handleSubmit = async (formEl) => {
    if (!formEl) return;
    await formEl.validate(async (valid) => {
        if (valid) {
            try {
                const response = await api.createCompetition({
                    comp_name: form.comp_name,
                    comp_level: form.comp_level,
                    comp_type: form.comp_type,
                    organizer: form.organizer,
                    undertaker: form.undertaker,
                    manager_id: form.manager_id,
                    college: form.college,
                    desc: form.desc,
                    year: form.year
                });

                ElMessage.success('赛事新增成功！');
                router.push({ name: 'CompetitionList' });
            } catch (error) {
                ElMessage.error('新增失败，请检查信息是否完整');
                console.error('创建赛事失败:', error);
            }
        }
    });
};
const handleReset = (formEl) => {
    if (!formEl) return;
    formEl.resetFields();
};

// Tab 2 从往年赛事复用
const step = ref(1);// 当前步骤: 1-选择往年赛事目录 2-确认并跳转赛事信息
const copySourceYear = ref('');
const targetYear = ref(''); // 保存目标年份，用于显示提示信息
const historyLoading = ref(false);
const historyTableData = ref([]);
const selectedHistoryRows = ref([]);
const importList = ref([]); // 导入列表，用于第二步编辑
const yearOptions = ref([]); // 年份选项列表
const yearsLoading = ref(false); // 年份加载状态
const collegeList = ref([]); // 学院列表

// 下载年份列表
const initializeYears = async () => {
    yearsLoading.value = true;
    try {
        const response = await api.getCompetitionYears();
        if (response.code === 200 && response.data.years) {
            yearOptions.value = response.data.years.map(year => ({
                label: `${year}年`,
                value: year.toString()
            }));
        }
    } catch (error) {
        console.error('获取年份列表失败:', error);
    }
    yearsLoading.value = false;
};

// 加载学院列表
const loadColleges = async () => {
    try {
        const res = await api.getCollegeList();
        if (res.code === 0 || res.code === 200) {
            collegeList.value = res.data || [];
        }
    } catch (error) {
        console.error('加载学院列表失败:', error);
    }
};

// 组件挂载时初始化
onMounted(() => {
    initializeYears(); loadColleges();    // 从路由参数中读取年份，如果有的话直接填充
    if (route.query.year) {
        form.year = route.query.year;
    }
    // 从路由参数中读取tab标识，设置激活的Tab
    if (route.query.tab) {
        activeTab.value = route.query.tab;
    }
});

// 查询历史数据
const fetchHistoryData = () => {
    if (!copySourceYear.value) return;
    historyLoading.value = true;

    // 调用后端接口，按年份筛选竞赛数据
    api.getCompetitionList({
        page: 1,
        page_size: 100, // 获取该年份的所有竞赛
        year: copySourceYear.value
    }).then(response => {
        if (response.code === 200) {
            // 将响应数据映射到表格显示
            historyTableData.value = response.data.list.map(item => ({
                id: item.id,
                comp_name: item.comp_name,
                comp_level: item.comp_level,
                organizer: item.organizer,
                undertaker: item.undertaker,
                manager: item.manager.realname,
                manager_id: item.manager.id,
                college: item.college_info?.name || '-'
            }));
        } else {
            ElMessage.error(response.msg || '获取历史数据失败，请稍后重试');
            console.error('获取历史数据失败:', response);
            historyTableData.value = [];
        }
        historyLoading.value = false;
    }).catch(error => {
        ElMessage.error('获取历史数据失败，请稍后重试');
        console.error('获取历史数据失败:', error);
        historyTableData.value = [];
        historyLoading.value = false;
    });
};

// 监听表格选择
const handleSelectionChange = (val) => {
    selectedHistoryRows.value = val;
};

// 进入下一步: 修改赛事信息
const handleNextStep = () => {
    if (selectedHistoryRows.value.length === 0) {
        ElMessage.warning('请至少选择一项往年赛事');
        return;
    }

    // 数据清洗逻辑
    const calculatedTargetYear = route.query.year || new Date().getFullYear().toString(); // 使用路由年份，如果没有则用当前年份
    targetYear.value = calculatedTargetYear; // 保存目标年份用于显示
    const sourceYear = copySourceYear.value; // 来源年份

    // 深拷贝并处理数据
    importList.value = selectedHistoryRows.value.map(item => {
        // 自动替换名称中的年份
        let newName = item.comp_name;
        if (sourceYear && newName.includes(sourceYear)) {
            newName = newName.replace(sourceYear, calculatedTargetYear);
        }

        return {
            ...item,
            // 可以在这里清空某些不该复制的字段，比如“状态”
            status: '未开始',
            // 赋上处理过的新名称
            comp_name: newName,            // 标记原始ID，方便后端溯源
            source_id: item.id,
            manager_id: item.manager_id,
            year: calculatedTargetYear
        };
    });

    step.value = 2; // 进入下一步
};

// 第二步中的移除操作
const removeImportItem = (index) => {
    importList.value.splice(index, 1);
    // 如果全删完了，自动回退
    if (importList.value.length === 0) {
        step.value = 1;
    }
};

// 最终提交
const handleFinalImport = () => {
    // 简单校验：检查是否有空名称
    if (importList.value.some(item => !item.comp_name)) {
        ElMessage.error('赛事名称不能为空');
        return;
    }

    // 校验学院是否在数据库中存在
    if (collegeList.value.length > 0) {
        const collegeNames = new Set(collegeList.value.map(c => c.name));
        const invalidItem = importList.value.find(item => item.college && !collegeNames.has(item.college));
        if (invalidItem) {
            ElMessage.error(`赛事"${invalidItem.comp_name}"的学院"${invalidItem.college}"不存在，请检查后重试`);
            return;
        }
    }

    ElMessageBox.confirm(
        `确认将这 ${importList.value.length} 项赛事导入到本年度赛事库吗？`,
        '最终确认',
        { confirmButtonText: '确认导入', cancelButtonText: '取消', type: 'success' }
    ).then(async () => {
        try {
            await api.batchImportCompetition({
                items: importList.value
            });

            ElMessage.success('批量导入成功！');
            router.push({ name: 'CompetitionList' });
        } catch (error) {
            ElMessage.error(error.message || '导入失败');
        }
    }).catch(() => { });
};

// 负责人弹窗显示
const managerDialogVisible = ref(false); // 控制弹窗显示
const managerLoading = ref(false);       // 表格加载状态
const teacherList = ref([]);             // 教师列表数据
const currentManagerEditIndex = ref(-1); // 追踪当前编辑的是复用列表中的哪一项（-1表示手动新增）

// 搜索表单
const searchForm = reactive({
    name: '',
    work_id: '',
    college: ''
});

// 打开选择弹窗
const openManagerSelect = () => {
    currentManagerEditIndex.value = -1; // 标记为手动新增
    managerDialogVisible.value = true;
    getManagerList(); // 打开时获取一次列表
};

// 在复用列表中打开负责人选择弹窗
const openManagerSelectForImport = (index) => {
    currentManagerEditIndex.value = index; // 标记为复用列表中的第index项
    managerDialogVisible.value = true;
    getManagerList(); // 打开时获取一次列表
};

// 获取赛事负责人列表接口 
const getManagerList = () => {
    managerLoading.value = true;
    // 调用后端接口获取赛事负责人列表
    api.getManagerList({
        name: searchForm.name,
        work_id: searchForm.work_id,
        college: searchForm.college,
        page: managerCurrentPage.value,
        page_size: managerPageSize.value
    }).then(response => {
        if (response.code === 200) {
            teacherList.value = response.data.list;
            managerTotal.value = response.data.total;
        } else {
            ElMessage.error(response.msg || '获取负责人列表失败');
        }
        managerLoading.value = false;
    }).catch(error => {
        ElMessage.error('获取负责人列表失败，请稍后重试');
        console.error('获取负责人列表失败:', error);
        managerLoading.value = false;
    });
};

const debouncedSearch = debounce(() => {
    getManagerList();
}, 500);

// 分页数据
const managerCurrentPage = ref(1);
const managerPageSize = ref(10);
const managerTotal = ref(0);

// 分页处理
const handleManagerSizeChange = (val) => {
    managerPageSize.value = val;
    managerCurrentPage.value = 1; // 重置到第一页
    getManagerList();
};
const handleManagerCurrentChange = (val) => {
    managerCurrentPage.value = val;
    getManagerList();
};

// 重置搜索
const resetSearch = () => {
    searchForm.name = '';
    searchForm.work_id = '';
    searchForm.college = '';
    managerCurrentPage.value = 1; // 重置分页
    getManagerList();
};

// 确认选择某位教师
const selectTeacher = (row) => {
    if (activeSourceType.value === 'excel') {
        // Excel 导入 Tab 的逻辑
        if (currentManagerEditIndex.value !== -1 && excelList.value[currentManagerEditIndex.value]) {
            excelList.value[currentManagerEditIndex.value].manager = row.name;
            excelList.value[currentManagerEditIndex.value].manager_id = row.id;
            // Excel 导入时，自动更新工号
            excelList.value[currentManagerEditIndex.value].work_id = row.work_id || '';
        }
    } else if (currentManagerEditIndex.value === -1) {
        // 手动录入 Tab
        form.manager = row.name;
        form.manager_id = row.id;
    } else {
        // 往年复用 Tab (旧逻辑)
        if (importList.value[currentManagerEditIndex.value]) {
            importList.value[currentManagerEditIndex.value].manager = row.name;
            importList.value[currentManagerEditIndex.value].manager_id = row.id;
        }
    }
    managerDialogVisible.value = false;
    ElMessage.success(`已选择负责人：${row.name}`);
};


// Tab 3 从Excel导入赛事
const excelList = ref([]); // 存放解析后的 Excel 数据
const excelLoading = ref(false); // 解析 loading 状态

// 模板下载
const downloadTemplate = () => {
    // 这里可以使用 xlsx 生成一个空模板，或者请求后端静态资源
    const header = ['赛事名称', '赛事级别', '赛事类型', '主办单位', '承办单位', '赛事负责人工号', '赛事负责人姓名', '所属学院', '年份', '备注'];
    const data = [
        ['示例：xx大赛', '校级', '学科竞赛', 'xx大学', 'xx学院', '2026001', '张三', 'xx学院', '2026', '无']
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    // 设置列宽
    ws['!cols'] = [
        { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "导入模板");
    XLSX.writeFile(wb, "赛事导入模板.xlsx");
};

// 自动批量查询工号对应的负责人信息
const autoMatchManagersByWorkIds = async (items) => {
    const itemsWithWorkId = items.filter(item => item.work_id);
    if (itemsWithWorkId.length === 0) return;

    try {
        for (const item of itemsWithWorkId) {
            if (!item.work_id || item.manager_id) continue; // 跳过没有工号或已有manager_id的项
            
            const res = await api.getManagerList({
                page: 1,
                page_size: 10,
                work_id: item.work_id
            });

            if (res.code === 200 && res.data.list && res.data.list.length > 0) {
                const teacher = res.data.list[0];
                item.manager = teacher.name;
                item.manager_id = teacher.id;
            }
        }
        // 计算匹配成功的数量
        const successCount = items.filter(item => item.manager_id).length;
    } catch (error) {
        console.error('自动匹配负责人失败', error);
    }
};

// 处理文件上传与解析
const handleUploadChange = (uploadFile) => {
    // 简单的格式校验
    const isExcel = uploadFile.raw.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadFile.raw.type === 'application/vnd.ms-excel';
    if (!isExcel) {
        ElMessage.error('只能上传 xlsx / xls 文件');
        return;
    }

    excelLoading.value = true;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonResults = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // 解析逻辑：假设第一行是表头
            if (jsonResults.length < 2) {
                ElMessage.warning('表格内容为空');
                excelLoading.value = false;
                return;
            }

            // 映射数据 (从第二行开始)
            // 注意：这里需要根据你模板的列顺序来取值
            const list = jsonResults.slice(1).map(row => ({
                comp_name: row[0] || '',
                comp_level: row[1] || '',
                comp_type: row[2] || '',
                organizer: row[3] || '',
                undertaker: row[4] || '',
                work_id: row[5] ? String(row[5]) : '', // 读取工号
                manager: row[6] || '',                 // 读取姓名
                manager_id: '',
                college: row[7] || '',
                year: row[8] ? String(row[8]) : new Date().getFullYear().toString(),
                desc: row[9] || ''
            }));

            // 过滤掉完全空行
            excelList.value = list.filter(item => item.comp_name);
            ElMessage.success(`解析成功，共 ${excelList.value.length} 条数据`);
            
            // 自动根据工号匹配负责人信息
            await autoMatchManagersByWorkIds(excelList.value);
        } catch (error) {
            console.error(error);
            ElMessage.error('文件解析失败');
        } finally {
            excelLoading.value = false;
        }
    };
    reader.readAsArrayBuffer(uploadFile.raw);
};

// 移除某一行
const removeExcelItem = (index) => {
    excelList.value.splice(index, 1);
};

// 打开负责人选择 (复用现有的弹窗逻辑)
// 我们需要修改一下 openManagerSelect 逻辑，让它知道当前是在操作 excelList
const activeSourceType = ref(''); // 'manual', 'copy', 'excel'
const openManagerSelectForExcel = (index) => {
    currentManagerEditIndex.value = index;
    activeSourceType.value = 'excel'; // 标记来源
    managerDialogVisible.value = true;
    getManagerList();
};

// 提交 Excel 导入
const handleExcelImportSubmit = () => {
    if (excelList.value.length === 0) {
        ElMessage.warning('没有可导入的数据');
        return;
    }
    // 校验：检查是否有必要字段为空
    const invalidItem = excelList.value.find(item => !item.comp_name || !item.comp_level || !item.manager_id);
    if (invalidItem) {
        ElMessage.error('存在赛事名称、级别或负责人为空的数据，请补充完整');
        return;
    }

    // 校验学院是否在数据库中存在
    if (collegeList.value.length > 0) {
        const collegeNames = new Set(collegeList.value.map(c => c.name));
        const badCollege = excelList.value.find(item => item.college && !collegeNames.has(item.college));
        if (badCollege) {
            ElMessage.error(`赛事"${badCollege.comp_name}"的学院"${badCollege.college}"不存在，请检查后重试`);
            return;
        }
    }

    ElMessageBox.confirm(
        `确认导入这 ${excelList.value.length} 条赛事数据吗？`,
        '提示',
        { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
        try {
            await api.batchImportCompetition({ items: excelList.value });
            ElMessage.success('批量导入成功');
            router.push({ name: 'CompetitionList' });
        } catch (error) {
            ElMessage.error(error.message || '导入失败');
            console.error('Excel导入失败:', error);
        }
    }).catch(() => { });
};

// 根据工号查找负责人
const queryManagerByWorkId = async (row) => {
    // 如果没有工号，不做处理
    if (!row.work_id) return;

    try {
        // 复用已有的 getManagerList 接口，传入 work_id 进行精确查找
        // 假设接口支持 work_id 参数
        const res = await api.getManagerList({
            page: 1,
            page_size: 10,
            work_id: row.work_id
        });

        if (res.code === 200 && res.data.list && res.data.list.length > 0) {
            // 找到匹配的人员
            const teacher = res.data.list[0];
            row.manager = teacher.name; // 自动回填姓名
            row.manager_id = teacher.id; // 自动回填ID
            ElMessage.success(`已匹配负责人：${teacher.name}`);
        } else {
            ElMessage.warning(`未找到工号为 ${row.work_id} 的教师`);
            // 可以选择清空姓名，或者保留Excel里的原值
            row.manager_id = '';
        }
    } catch (error) {
        console.error('查询负责人失败', error);
    }
};



</script>

<template>
    <div class="add-container">
        <div class="content-box">
            <el-tabs v-model="activeTab" type="border-card" class="demo-tabs">
                <el-tab-pane name="manual">
                    <template #label>
                        <span class="custom-tabs-label"><el-icon>
                                <Plus />
                            </el-icon> 手动录入新赛事</span>
                    </template>
                    <div class="form-wrapper">
                        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <el-form-item label="赛事名称" prop="comp_name">
                                        <el-input v-model="form.comp_name" placeholder="请输入赛事名称" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="赛事级别" prop="comp_level">
                                        <el-select v-model="form.comp_level" placeholder="请选择级别" style="width: 100%">
                                            <el-option label="校级" value="校级" />
                                            <el-option label="省级" value="省级" />
                                            <el-option label="国家级" value="国家级" />
                                        </el-select>
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <el-form-item label="赛事类型" prop="comp_type">
                                        <el-select v-model="form.comp_type" placeholder="请选择类型" style="width: 100%">
                                            <el-option label="学科竞赛" value="学科竞赛" />
                                            <el-option label="创新创业竞赛" value="创新创业竞赛" />
                                        </el-select>
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="所属学院" prop="college">
                                        <el-select v-model="form.college" placeholder="请选择学院" style="width: 100%"
                                            clearable>
                                            <el-option v-for="college in collegeList" :key="college.id"
                                                :label="college.name" :value="college.name" />
                                        </el-select>
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <el-form-item label="主办单位" prop="organizer">
                                        <el-input v-model="form.organizer" placeholder="请填写主办单位" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="承办单位" prop="undertaker">
                                        <el-input v-model="form.undertaker" placeholder="请填写承办单位" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-row :gutter="20">
                                <el-col :span="12">
                                    <el-form-item label="赛事负责人" prop="manager">
                                        <el-input v-model="form.manager" placeholder="请选择赛事负责人" readonly
                                            class="manager-input" @click="openManagerSelect" />
                                    </el-form-item>
                                </el-col>
                                <el-col :span="12">
                                    <el-form-item label="所属年份" prop="year">
                                        <el-input v-model="form.year" placeholder="请选择所属年份" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-form-item label="备注说明" prop="desc">
                                <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="填写赛事的其他补充说明..." />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="handleSubmit(formRef)">创建</el-button>
                                <el-button @click="handleReset(formRef)">重置</el-button>
                            </el-form-item>
                        </el-form>
                    </div>
                </el-tab-pane>
                <el-tab-pane name="copy">
                    <template #label>
                        <span class="custom-tabs-label"><el-icon>
                                <DocumentCopy />
                            </el-icon> 从往年赛事复用</span>
                    </template>
                    <div class="wizard-container">
                        <el-steps :active="step" align-center finish-status="success" class="custom-steps">
                            <el-step title="选择往年赛事目录" description="勾选需要复用的项目" />
                            <el-step title="确认并跳转赛事信息" description="修改赛事基本信息" />
                        </el-steps>

                        <div v-if="step === 1" class="step-content">
                            <div class="filter-bar">
                                <el-form-item label="赛事所属年份">
                                    <el-select v-model="copySourceYear" placeholder="请选择年份" @change="fetchHistoryData"
                                        :loading="yearsLoading">
                                        <el-option v-for="year in yearOptions" :key="year.value" :label="year.label"
                                            :value="year.value" />
                                    </el-select>
                                </el-form-item>
                            </div>
                            <el-table :data="historyTableData" border v-loading="historyLoading"
                                @selection-change="handleSelectionChange" height="calc(100vh - 400px)">
                                <el-table-column type="selection" width="40" align="center" />
                                <el-table-column prop="comp_name" label="赛事名称" min-width="280" align="center" />
                                <el-table-column prop="comp_level" label="赛事级别" width="100" align="center" />
                                <el-table-column prop="organizer" label="主办单位" width="150" align="center" />
                                <el-table-column prop="undertaker" label="承办单位" width="150" align="center" />
                                <el-table-column prop="manager" label="赛事负责人" width="100" align="center" />
                                <el-table-column prop="college" label="所属学院" width="160" align="center" />
                                <template #empty>
                                    <el-empty description="暂无数据" />
                                </template>
                            </el-table>


                            <div class="step-footer">
                                <div class="info">已选择 <span class="num">{{ selectedHistoryRows.length }}</span> 项</div>
                                <el-button type="primary" @click="handleNextStep">
                                    下一步：修改赛事信息 <el-icon class="el-icon--right">
                                        <ArrowRight />
                                    </el-icon>
                                </el-button>
                            </div>
                        </div>

                        <div v-if="step === 2" class="step-content">
                            <div class="preview-tip">
                                <el-alert :title="`系统已自动替换年份为${targetYear}年，请在下方直接修改赛事变动信息`" type="info" show-icon
                                    :closable="false" />
                            </div>
                            <el-table :data="importList" border height="400" class="edit-table">
                                <el-table-column label="序号" type="index" width="55" align="center" />
                                <el-table-column label="新赛事名称 (可编辑)" min-width="220" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.comp_name" placeholder="赛事名称" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="负责人" width="140" align="center">
                                    <template #default="{ row, $index }">
                                        <el-input v-model="row.manager" placeholder="负责人" readonly class="manager-input"
                                            @click="openManagerSelectForImport($index)" />
                                    </template>
                                </el-table-column>

                                <el-table-column label="主办单位" width="180" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.organizer" placeholder="主办单位" />
                                    </template>
                                </el-table-column>

                                <el-table-column label="承办单位" width="150" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.undertaker" placeholder="承办单位" />
                                    </template>
                                </el-table-column>

                                <el-table-column label="所属学院" width="160" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.college" placeholder="所属学院" />
                                    </template>
                                </el-table-column>

                                <el-table-column label="操作" width="60" align="center">
                                    <template #default="{ $index }">
                                        <el-button type="danger" link :icon="Delete"
                                            @click="removeImportItem($index)" />
                                    </template>
                                </el-table-column>
                            </el-table>
                            <div class="step-footer">
                                <el-button @click="step = 1" :icon="ArrowLeft">上一步</el-button>
                                <el-button type="success" @click="handleFinalImport">
                                    <el-icon class="el-icon--left">
                                        <Check />
                                    </el-icon> 确认导入
                                </el-button>
                            </div>
                        </div>


                    </div>
                </el-tab-pane>
                <el-tab-pane name="import">
                    <template #label>
                        <span class="custom-tabs-label">
                            <el-icon>
                                <UploadFilled />
                            </el-icon> Excel 批量导入
                        </span>
                    </template>
                    <div class="import-container">
                        <div class="import-header">
                            <el-alert title="请先下载模板，按格式填入数据后上传。" type="info" show-icon :closable="false"
                                class="import-title" />
                            <div class="action-bar">
                                <el-button type="primary" plain @click="downloadTemplate">
                                    <el-icon class="el-icon--left">
                                        <Download />
                                    </el-icon>下载导入模板
                                </el-button>
                                <el-upload class="upload-demo" action="#" :auto-upload="false" :show-file-list="false"
                                    :on-change="handleUploadChange" accept=".xlsx, .xls">
                                    <el-button type="primary">
                                        <el-icon class="el-icon--left">
                                            <FolderOpened />
                                        </el-icon>选择文件上传
                                    </el-button>
                                </el-upload>
                                <el-button type="success" @click="handleExcelImportSubmit"
                                    :disabled="excelList.length === 0">
                                    <el-icon class="el-icon--left">
                                        <Check />
                                    </el-icon>确认导入
                                </el-button>
                            </div>
                        </div>
                        <el-table v-if="excelList.length > 0" :data="excelList" border stripe height="450"
                            v-loading="excelLoading" class="edit-table" style="margin-top: 20px;">
                            <el-table-column label="序号" type="index" width="55" align="center" />

                            <el-table-column label="赛事名称" min-width="200" align="center">
                                <template #default="{ row }">
                                    <el-input v-model="row.comp_name" placeholder="请输入赛事名称" />
                                </template>
                            </el-table-column>

                            <el-table-column label="级别" width="110" align="center">
                                <template #default="{ row }">
                                    <el-select v-model="row.comp_level" placeholder="级别">
                                        <el-option label="校级" value="校级" />
                                        <el-option label="省级" value="省级" />
                                        <el-option label="国家级" value="国家级" />
                                    </el-select>
                                </template>
                            </el-table-column>

                            <el-table-column label="类型" width="130" align="center">
                                <template #default="{ row }">
                                    <el-select v-model="row.comp_type" placeholder="类型">
                                        <el-option label="学科竞赛" value="学科竞赛" />
                                        <el-option label="创新创业竞赛" value="创新创业竞赛" />
                                    </el-select>
                                </template>
                            </el-table-column>

                            <el-table-column label="主办单位" width="150" align="center">
                                <template #default="{ row }">
                                    <el-input v-model="row.organizer" />
                                </template>
                            </el-table-column>

                            <el-table-column label="负责人工号" width="140" align="center">
                                <template #default="{ row }">
                                    <el-input v-model="row.work_id" placeholder="输入工号回车"
                                        @change="queryManagerByWorkId(row)">
                                        <template #suffix>
                                            <el-icon>
                                                <Search />
                                            </el-icon>
                                        </template>
                                    </el-input>
                                </template>
                            </el-table-column>

                            <el-table-column label="负责人姓名" width="120" align="center">
                                <template #default="{ row, $index }">
                                    <el-input v-model="row.manager" placeholder="自动匹配或点击选择" readonly
                                        @click="openManagerSelectForExcel($index)">
                                        <template #prefix>
                                            <el-icon v-if="row.manager_id" color="#67C23A">
                                                <CircleCheck />
                                            </el-icon>
                                            <el-icon v-else color="#F56C6C">
                                                <Warning />
                                            </el-icon>
                                        </template>
                                    </el-input>
                                </template>
                            </el-table-column>

                            <el-table-column label="所属学院" width="160" align="center">
                                <template #default="{ row }">
                                    <el-select v-model="row.college" placeholder="选择学院" clearable>
                                        <el-option v-for="c in collegeList" :key="c.id" :label="c.name"
                                            :value="c.name" />
                                    </el-select>
                                </template>
                            </el-table-column>

                            <el-table-column label="年份" width="100" align="center">
                                <template #default="{ row }">
                                    <el-input v-model="row.year" placeholder="年份" />
                                </template>
                            </el-table-column>

                            <el-table-column label="操作" width="60" align="center" fixed="right">
                                <template #default="{ $index }">
                                    <el-button type="danger" link :icon="Delete" @click="removeExcelItem($index)" />
                                </template>
                            </el-table-column>
                        </el-table>
                        <el-empty v-else description="请上传 Excel 文件进行预览" />
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
    <!-- 负责人选择弹窗 -->
    <el-dialog v-model="managerDialogVisible" title="选择赛事负责人" width="800px" aligin-center append-to-body>
        <div class="search-bar">
            <el-form :inline="true" :model="searchForm" class="search-form-inline">
                <el-form-item label="姓名">
                    <el-input v-model="searchForm.name" placeholder="输入姓名" clearable @input="debouncedSearch"
                        @clear="getManagerList" style="width: 120px;" />
                </el-form-item>
                <el-form-item label="工号">
                    <el-input v-model="searchForm.work_id" placeholder="输入工号" clearable @input="debouncedSearch"
                        @clear="getManagerList" style="width: 120px;" />
                </el-form-item>
                <el-form-item label="所属学院">
                    <el-select v-model="searchForm.college" placeholder="选择学院" clearable @change="getManagerList"
                        @clear="getManagerList" style="width: 180px;">
                        <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院" />
                        <el-option label="电子信息工程学院" value="电子信息工程学院" />
                        <el-option label="经济管理学院" value="经济管理学院" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button @click="resetSearch">重置</el-button>
                </el-form-item>
            </el-form>
        </div>
        <el-table :data="teacherList" border stripe v-loading="managerLoading" height="350" style="width: 100%">
            <el-table-column prop="work_id" label="工号" width="120" align="center" />
            <el-table-column prop="name" label="姓名" width="120" align="center" />
            <el-table-column prop="college" label="所属学院" min-width="200" align="center" />
            <el-table-column label="操作" width="100" align="center" fixed="right">
                <template #default="{ row }">
                    <el-button type="primary" link @click="selectTeacher(row)">选择</el-button>
                </template>
            </el-table-column>
            <template #empty>
                <el-empty description="暂无数据" />
            </template>
        </el-table>
        <div class="pagination-wrapper">
            <el-pagination v-model:current-page="managerCurrentPage" v-model:page-size="managerPageSize"
                :page-sizes="[10, 20, 30]" layout="total, sizes, prev, pager, next, jumper" :total="managerTotal"
                @size-change="handleManagerSizeChange" @current-change="handleManagerCurrentChange" />
        </div>
    </el-dialog>
</template>

<style scoped lang="scss">
.add-container {
    box-sizing: border-box;
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--background-color);
}

.content-box {
    overflow: auto;
}

.form-wrapper {
    max-width: 1000px;
    margin: 0 auto;
}

/* 向导样式 */
.wizard-container {
    max-width: 1000px;
    margin: 0 auto;
}

.custom-steps {
    margin-bottom: 8px;
}

.step-content {
    animation: fadeIn 0.3s ease;
}

.filter-bar {
    margin-bottom: 10px;

    .label {
        font-weight: bold;
        margin-right: 10px;
    }

    :deep(.el-form-item__label) {
        font-size: 15px;
    }
}

.step-footer {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    align-items: center;

    .info {
        margin-right: 20px;
        color: #606266;

        .num {
            color: var(--el-color-primary);
            font-weight: bold;
            font-size: 18px;
            margin: 0 4px;
        }
    }
}

.preview-tip {
    margin-bottom: 15px;
}

// 表格样式微调 
.edit-table {
    :deep(.el-input__wrapper:hover) {
        border-bottom-color: var(--el-color-primary);
    }
}

// 搜索栏样式
.search-bar {
    margin-bottom: 15px;

    :deep(.el-form--inline .el-form-item) {
        margin-right: 15px;
    }

    :deep(.el-form--inline) {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
    }
}

// 分页样式
.pagination-wrapper {
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
    padding: 15px 0;
    border-top: 1px solid #eee;
}

// 赛事负责人输入框样式

:deep(.manager-input input) {
    cursor: pointer !important;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}



.import-title {
    margin-bottom: 10px;
}

.import-header {
    .action-bar {
        display: flex;
        gap: 15px;
        align-items: center;
    }

    .upload-demo {
        display: inline-block;
    }
}
</style>