<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Download, Upload, Plus, Delete, ArrowDown, Edit, Setting } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import api from '@/api/index';
import * as XLSX from 'xlsx';

// 搜索表单数据
const searchForm = reactive({
    comp_code: '',
    comp_name: '',
    comp_type: '',
    comp_level: '',
    college: '',
    manager: '',
    status: '',
})

// 重置按钮
const handleReset = () => {
    searchForm.comp_code = '';
    searchForm.comp_name = '';
    searchForm.comp_type = '';
    searchForm.comp_level = '';
    searchForm.college = '';
    searchForm.manager = '';
    searchForm.status = '';

    // 重置分页
    current_page.value = 1;
    page_size.value = 10;

    // 重新搜索以加载第一页数据
    handleSearch();
};

// 表格数据
const tableData = ref([])

// 表格引用
const tableRef = ref(null)

// 多选选中的数据
const selectedRows = ref([])

// 学院列表
const collegeList = ref([]);

// 加载状态
const loading = ref(false);

// 路由实例
const router = useRouter();

// 用户角色
const userStore = useUserStore();

// 新增赛事
const handleAddCompetition = () => {
    router.push({ name: 'CompetitionAdd', query: { year: currentYear.value } });
};

// 导入数据
const handleImport = () => {
    router.push({ name: 'CompetitionAdd', query: { year: currentYear.value, tab: 'import' } });
};

// 赛事申报
const handleDeclare = () => {
    router.push('/competition/audit');
};

// 年份切换
const handleYearSwitch = (year) => {
    currentYear.value = year;
    searchForm.year = year;

    // 重置分页到第一页
    current_page.value = 1;

    // 重新加载数据
    handleSearch();
};

// 年份管理数据
const currentYear = ref(new Date().getFullYear().toString()); // 当前选中的年份（系统当前年份）
const yearList = ref(['2026', '2025', '2024', '2023']); // 可选年份列表
// 弹窗控制
const yearManageVisible = ref(false);
const newYearInput = ref('');
// 构造表格数据（包装对象支持行内编辑）
const yearTableData = ref([]);

// 1. 下拉菜单指令处理
const handleYearCommand = (command) => {
    if (command === 'manage_years') {
        openManageDialog();
    } else {
        handleYearSwitch(command);
    }
};

// 2. 打开管理弹窗
const openManageDialog = () => {
    // 将简单数组转换为对象数组，方便管理编辑状态
    yearTableData.value = yearList.value.map(year => ({
        year: year,
        editValue: year,
        isEditing: false
    }));
    newYearInput.value = '';
    yearManageVisible.value = true;
};

// 3. 弹窗内：新增年份
const handleAddYearInDialog = () => {
    const year = newYearInput.value.trim();
    // 简单正则校验：4位数字
    if (!/^\d{4}$/.test(year)) {
        ElMessage.warning('请输入正确的4位年份格式');
        return;
    }
    if (yearList.value.includes(year)) {
        ElMessage.warning('该年份目录已存在');
        return;
    }

    // 更新原始列表和表格数据
    yearList.value.unshift(year); // 加到最前面
    yearTableData.value.unshift({
        year: year,
        editValue: year,
        isEditing: false
    });

    newYearInput.value = '';
    ElMessage.success('添加成功');
};

// 4. 弹窗内：修改年份（开始编辑）
const handleStartEdit = (index) => {
    // 重置其他行，保证同时只编辑一行
    yearTableData.value.forEach(item => item.isEditing = false);
    yearTableData.value[index].isEditing = true;
    yearTableData.value[index].editValue = yearTableData.value[index].year;
};

// 5. 弹窗内：保存修改
const handleSaveEdit = (index) => {
    const row = yearTableData.value[index];
    const newYear = row.editValue.trim();
    const oldYear = row.year;

    if (!/^\d{4}$/.test(newYear)) {
        ElMessage.warning('年份格式不正确');
        return;
    }
    // 如果改成了和其他行一样的年份
    if (newYear !== oldYear && yearList.value.includes(newYear)) {
        ElMessage.warning('该年份已存在，无法重复');
        return;
    }

    // TODO: 这里应该调用后端接口修改年份名称
    // api.updateYear({ old: oldYear, new: newYear }).then(...)

    // 更新前端数据
    const listIndex = yearList.value.indexOf(oldYear);
    if (listIndex !== -1) {
        yearList.value[listIndex] = newYear;
    }
    row.year = newYear;
    row.isEditing = false;

    // 如果当前选中的就是被修改的年份，同步更新选中状态
    if (currentYear.value === oldYear) {
        currentYear.value = newYear;
        searchForm.year = newYear;
    }

    ElMessage.success('修改成功');
};

// 6. 弹窗内：取消编辑
const handleCancelEdit = (index) => {
    yearTableData.value[index].isEditing = false;
};

// 7. 弹窗内：删除年份
const handleDeleteYear = (year) => {
    // 模拟检查：如果该年份下有数据（这里仅演示，实际应根据API或当前加载的数据判断）
    // 严格来说，应该调用一个 checkDataExist(year) 的接口
    if (year === '2025' && tableData.value.length > 0) {
        ElMessage.error('该年度目录下包含赛事数据，禁止删除！请先清空该年度下的赛事。');
        return;
    }

    ElMessageBox.confirm(
        `确定要删除 ${year} 年度目录吗？`,
        '警告',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
        // 从原始列表移除
        const index = yearList.value.indexOf(year);
        if (index > -1) yearList.value.splice(index, 1);

        // 从表格移除
        const tableIndex = yearTableData.value.findIndex(item => item.year === year);
        if (tableIndex > -1) yearTableData.value.splice(tableIndex, 1);

        // 如果删除了当前选中的年份，自动切换到最新的年份
        if (currentYear.value === year) {
            const nextYear = yearList.value[0] || '';
            if (nextYear) handleYearSwitch(nextYear);
        }

        ElMessage.success('删除成功');
    }).catch(() => { });
};

// 8. 关闭弹窗时的收尾
const handleManageClose = () => {
    // 这里可以再次确保 yearList 和 yearTableData 同步，或者做一些清理
};

// 删除操作
const handleDelete = async (row) => {
    ElMessageBox.confirm(
        `确定要删除 "${row.comp_name}" 吗?`,
        '警告',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
        try {
            await api.deleteCompetition(row.id);
            ElMessage.success('删除成功');
            // 重新加载列表
            handleSearch();
        } catch (error) {
            ElMessage.error(error.message || '删除失败');
        }
    }).catch(() => { });
};

// 处理表格选择变化
const handleSelectionChange = (selection) => {
    selectedRows.value = selection;
};

// 批量删除
const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) {
        ElMessage.warning('请先选择要删除的赛事');
        return;
    }

    ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.value.length} 条赛事吗?`,
        '警告',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
        try {
            const ids = selectedRows.value.map(row => row.id);
            await api.batchDeleteCompetition(ids);
            ElMessage.success('批量删除成功');
            // 清空选中
            tableRef.value.clearSelection();
            // 重新加载列表
            handleSearch();
        } catch (error) {
            ElMessage.error(error.message || '批量删除失败');
        }
    }).catch(() => { });
};

// 获取项目来源文本
const getSourceText = (source) => {
    const sourceMap = {
        1: '学校导入',
        2: '学院申报'
    };
    return sourceMap[source] || '-';
};

// 导出数据
const handleExport = async () => {
    try {
        loading.value = true;
        // 1. 构造查询参数，但将 page_size 设置得很大，或者后端支持 page_size=-1 代表全部
        const params = {
            page: 1,
            page_size: 2000, // 获取所有数据
            year: currentYear.value,
            comp_name: searchForm.comp_name,
            comp_level: searchForm.comp_level,
            college: searchForm.college,
            manager: searchForm.manager,
            status: searchForm.status,
        };

        // 2. 调用 API 获取所有数据
        const response = await api.getCompetitionList(params);

        if (response.code !== 200 && response.code !== 0) {
            throw new Error(response.message || '获取导出数据失败');
        }

        const allList = response.data.list || [];

        if (allList.length === 0) {
            ElMessage.warning('暂无数据可导出');
            return;
        }

        // 3. 数据格式化
        const dataTOExport = allList.map(item => {
            let statusText = '';
            if (item.status === 1) statusText = '进行中';
            else if (item.status === 2) statusText = '已结束';
            else statusText = '未开始';

            return {
                '赛事编号': item.comp_code || '-',
                '赛事名称': item.comp_name || '-',
                '赛事级别': item.comp_level || '-',
                '主办单位': item.organizer || '-',
                '承办单位': item.undertaker || '-',
                '赛事负责人': item.manager?.realname || '-',
                '所属学院': item.college_info?.name || '-',
                '项目来源': getSourceText(item.source),
                '状态': statusText,
            };
        });

        // 4.创建工作簿和工作表
        const worksheet = XLSX.utils.json_to_sheet(dataTOExport);
        const workbook = XLSX.utils.book_new();

        // 设置列宽
        const wscols = [
            { wch: 15 }, // 赛事编号
            { wch: 30 }, // 赛事名称
            { wch: 15 }, // 赛事级别
            { wch: 25 }, // 主办单位
            { wch: 25 }, // 承办单位
            { wch: 20 }, // 赛事负责人
            { wch: 25 }, // 所属学院
            { wch: 20 }, // 项目来源
            { wch: 10 }, // 状态
        ];
        worksheet['!cols'] = wscols;

        // 将工作表添加到工作簿，命名为“赛事列表”
        XLSX.utils.book_append_sheet(workbook, worksheet, '赛事列表');

        // 5. 导出为Excel文件
        XLSX.writeFile(workbook, `赛事列表_${currentYear.value}年度.xlsx`);

        ElMessage.success('导出成功');
    } catch (error) {
        console.error('导出失败：', error);
        ElMessage.error('导出失败');
    } finally {
        loading.value = false;
    }
};

// 分页数据
const current_page = ref(1);
const page_size = ref(10);
const total = ref(100);

//分页处理
const handleSizeChange = (val) => {
    page_size.value = val;
    handleSearch();
};
const handleCurrentChange = (val) => {
    current_page.value = val;
    handleSearch();
};

// 搜索功能
const handleSearch = async () => {
    loading.value = true;
    try {
        // 构建查询参数
        const params = {
            page: current_page.value,
            page_size: page_size.value,
            year: currentYear.value, // 添加年份筛选
        };

        // 添加可选的搜索和筛选参数
        if (searchForm.comp_name) {
            params.comp_name = searchForm.comp_name;
        }
        if (searchForm.comp_level) {
            params.comp_level = searchForm.comp_level;
        }
        if (searchForm.college) {
            params.college = searchForm.college;
        }
        if (searchForm.manager) {
            params.manager = searchForm.manager;
        }
        if (searchForm.status) {
            params.status = searchForm.status;
        }

        console.log('调用赛事列表接口，参数：', params);

        // 调用后端接口获取数据
        const response = await api.getCompetitionList(params);
        console.log('赛事列表API响应：', response);

        if (response.code === 200 || response.code === 0) {
            tableData.value = response.data.list || [];
            total.value = response.data.total || 0;
            console.log('数据加载成功，共', tableData.value.length, '条记录');
        } else {
            ElMessage.error(response.message || response.msg || '获取数据失败');
        }
    } catch (error) {
        console.error('搜索请求失败：', error);
        ElMessage.error('搜索失败，请检查网络或重试');
    } finally {
        loading.value = false;
    }
};

// 加载学院列表
const loadCollegeList = async () => {
    try {
        const response = await api.getCollegeList();
        if (response.code === 0 || response.code === 200) {
            collegeList.value = response.data || [];
        } else {
            ElMessage.error('加载学院列表失败');
        }
    } catch (error) {
        console.error('加载学院列表失败：', error);
    }
};

// 页面加载时初始化数据
onMounted(() => {
    loadCollegeList();
    handleSearch();
});

</script>

<template>
    <div class="competition-container">
        <!-- 赛事列表头部搜索栏 -->
        <div class="search-container">
            <el-form :inline="true" :model="searchForm" class="search-form" label-width="100px" label-position="right">
                <el-form-item label="赛事名称">
                    <el-input v-model="searchForm.comp_name" placeholder="请输入赛事名称" clearable="true" style="width:220px"
                        maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="赛事级别">
                    <el-select v-model="searchForm.comp_level" placeholder="请选择赛事级别" clearable="true"
                        style="width: 220px">
                        <el-option label="校级" value="校级"></el-option>
                        <el-option label="省级" value="省级"></el-option>
                        <el-option label="国家级" value="国家级"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="所属学院">
                    <el-select v-model="searchForm.college" placeholder="请选择所属学院" clearable="true" style="width: 220px">
                        <el-option v-for="college in collegeList" :key="college.id" :label="college.name"
                            :value="college.name"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="赛事负责人">
                    <el-input v-model="searchForm.manager" placeholder="请输入赛事负责人" clearable="true" style="width:220px"
                        maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="赛事状态">
                    <el-select v-model="searchForm.status" placeholder="请选择赛事状态" clearable="true" style="width: 220px;">
                        <el-option label="未开始" value="未开始"></el-option>
                        <el-option label="进行中" value="进行中"></el-option>
                        <el-option label="已结束" value="已结束"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item class="search-actions">
                    <el-button type="primary" :icon="Search"  @click="handleSearch">搜索</el-button>
                    <el-button type="default" :icon="Refresh" plain @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>
        </div>

        <!-- 赛事列表表格 -->
        <div class="competition-table-container">
            <div class="table-toolbar">
                <div class="left-actions">
                    <el-button v-if="userStore.role === 'school_admin'" type="primary" :icon="Plus"
                        @click="handleAddCompetition">新增赛事</el-button>
                    <el-button v-if="userStore.role === 'college_admin'" type="primary" :icon="Plus"
                        @click="handleDeclare">
                        赛事申报
                    </el-button>
                    <el-button v-if="userStore.role === 'school_admin'" type="danger" plain :icon="Delete"
                        @click="handleBatchDelete">批量删除</el-button>
                    <el-button type="info" plain :icon="Download" @click="handleExport">导出数据</el-button>
                    <el-button v-if="userStore.role === 'school_admin'" type="default" :icon="Upload"
                        plain @click="handleImport">导入数据</el-button>
                </div>
                <div class="right-info">
                    <el-dropdown trigger="click" @command="handleYearCommand">
                        <div class="year-switch-tag">
                            <span class="tag-text">当前：{{ currentYear }}年度赛事</span>
                            <el-icon class="tag-icon">
                                <ArrowDown />
                            </el-icon>
                        </div>

                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item v-for="year in yearList" :key="year" :command="year"
                                    :class="{ 'is-active': currentYear === year }">
                                    {{ year }}年度
                                </el-dropdown-item>
                                <el-dropdown-item divided command="manage_years">
                                    <el-icon>
                                        <Setting />
                                    </el-icon> 管理年度目录
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
            <el-dialog v-model="yearManageVisible" title="年度目录管理" width="500px" align-center
                @closed="handleManageClose">
                <div class="manage-header" style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <el-input v-model="newYearInput" placeholder="输入年份 (如 2026)" style="flex: 1" maxlength="4"
                        clearable />
                    <el-button type="primary" :icon="Plus" @click="handleAddYearInDialog">新增年份</el-button>
                </div>

                <el-table :data="yearTableData" border stripe style="width: 100%" max-height="400">
                    <el-table-column prop="year" label="年份目录" align="center">
                        <template #default="scope">
                            <el-input v-if="scope.row.isEditing" v-model="scope.row.editValue" size="small" autofocus />
                            <span v-else>{{ scope.row.year }}年度</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="操作" width="160" align="center">
                        <template #default="scope">
                            <div v-if="scope.row.isEditing">
                                <el-button link type="success" size="small"
                                    @click="handleSaveEdit(scope.$index)">保存</el-button>
                                <el-button link type="info" size="small"
                                    @click="handleCancelEdit(scope.$index)">取消</el-button>
                            </div>
                            <div v-else>
                                <el-button link type="primary" size="small" :icon="Edit"
                                    @click="handleStartEdit(scope.$index)">修改</el-button>
                                <el-button link type="danger" size="small" :icon="Delete"
                                    @click="handleDeleteYear(scope.row.year)">删除</el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </el-dialog>

            <el-table v-loading="loading" ref="tableRef" :data="tableData" stripe height="calc(100vh - 400px)" style="width: 100%"
                @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="40" />
                <el-table-column label="赛事编号" min-width="100" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.comp_code || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="赛事名称" min-width="200" show-overflow-tooltip align="center">
                    <template #default="scope">
                        {{ scope.row.comp_name || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="赛事级别" width="100" align="center">
                    <template #default="scope">
                        {{ scope.row.comp_level || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="主办单位" min-width="150" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.organizer || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="承办单位" min-width="150" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.undertaker || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="赛事负责人" width="120" align="center">
                    <template #default="scope">
                        {{ scope.row.manager?.realname || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="所属学院" width="200" align="center">
                    <template #default="scope">
                        {{ scope.row.college_info?.name || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="项目来源" min-width="90" align="center">
                    <template #default="scope">
                        {{ getSourceText(scope.row.source) }}
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="90" align="center">
                    <template #default="scope">
                        <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small" effect="plain">{{
                            scope.row.status === 1 ? '进行中' : scope.row.status === 2 ? '已结束' : '未开始' }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="150" align="center" fixed="right">
                    <template #default="scope">
                        <el-button link type="primary" size="small" :icon="Edit"
                            @click="handleEdit(scope.row)">编辑</el-button>
                        <el-button link type="danger" size="small" :icon="Delete"
                            @click="handleDelete(scope.row)">删除</el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="暂无数据" />
                </template>
            </el-table>
            <div class="pagination-wrapper">
                <el-pagination v-model:current-page="current_page" v-model:page-size="page_size"
                    :page-sizes="[10, 20, 30, 50]" layout="total, sizes, prev, pager, next, jumper" :total="total"
                    @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.competition-container {
    width: 100%;
    height: 100%;
    background-color: var(--background-color);
    padding: 20px;
    box-sizing: border-box;
}

.search-container {
    box-sizing: border-box;
    margin-bottom: 15px;
    padding: 20px 20px 10px 20px;
    background-color: #ffffff;
    box-shadow: var(--card-shadow);
    border-radius: 4px;

    .search-form {
        .el-form-item {
            margin-bottom: 15px;
            margin-left: 15px;
        }

        .search-actions {
            margin-left: 45px;

            .el-button {
                margin-right: 10px;
            }
        }
    }
}

.competition-table-container {
    box-sizing: border-box;
    padding: 20px 20px 10px 20px;
    background-color: #ffffff;
    box-shadow: var(--card-shadow);
    border-radius: 4px;

    .table-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;

        .left-actions {
            display: flex;
            gap: 10px;
        }

        .right-info {
            display: flex;
            align-items: center;

            .year-switch-tag {
                cursor: pointer;
                font-size: 13px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                height: 32px;
                padding: 0 10px;
                border: 1px solid var(--el-border-color-light);
                border-radius: 4px;
                white-space: nowrap;
                transition: all 0.3s;

                .tag-text {
                    flex: 0 0 auto;
                    white-space: nowrap;
                }

                .tag-icon {
                    flex: 0 0 auto;
                    font-size: 14px;
                    margin: 0;
                }

                &:hover {
                    color: var(--el-color-primary);
                    border-color: var(--el-color-primary-light-5);
                    background-color: var(--el-color-primary-light-9);
                }
            }
        }
    }
}

.pagination-wrapper {
    margin-top: 10px;
    display: flex;
    justify-content: center;
}
</style>