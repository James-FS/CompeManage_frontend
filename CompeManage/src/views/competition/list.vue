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

// 按账号记住年度选择，刷新或重新进入页面时恢复。
const selectedYearKey = `competition:selected-year:${userStore.userInfo.id || userStore.userInfo.username || 'default'}`;
const readSelectedYear = () => {
    try {
        return localStorage.getItem(selectedYearKey) || '';
    } catch {
        return '';
    }
};
const selectYear = (year) => {
    currentYear.value = year;
    searchForm.year = year;
    try {
        if (year) localStorage.setItem(selectedYearKey, year);
        else localStorage.removeItem(selectedYearKey);
    } catch {
        // 浏览器禁用存储时，仍允许正常切换和查询年度。
    }
};

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
    selectYear(year);

    // 重置分页到第一页
    current_page.value = 1;

    // 重新加载数据
    handleSearch();
};

// 年度目录由后端保存，空目录也会保留。
const currentYear = ref(readSelectedYear());
const yearList = ref([]);
const yearManageVisible = ref(false);
const newYearInput = ref('');
const yearTableData = ref([]);
const yearLoading = ref(false);
const yearSaving = ref(false);

const rebuildYearTable = () => {
    yearTableData.value = yearList.value.map(year => ({ year, editValue: year, isEditing: false }));
};

const loadYears = async (preferredYear = currentYear.value || new Date().getFullYear().toString()) => {
    yearLoading.value = true;
    try {
        const response = await api.getCompetitionYears();
        yearList.value = (response.data?.years || []).map(String);
        selectYear(yearList.value.includes(preferredYear) ? preferredYear
            : yearList.value[0] || '');
        rebuildYearTable();
    } finally {
        yearLoading.value = false;
    }
};

const openManageDialog = () => {
    if (userStore.role !== 'school_admin') return;
    rebuildYearTable();
    newYearInput.value = '';
    yearManageVisible.value = true;
};

const handleYearCommand = (command) => {
    if (command === 'manage_years') openManageDialog();
    else handleYearSwitch(command);
};

const isValidYear = (year) => /^[1-9]\d{3}$/.test(year);

const handleAddYearInDialog = async () => {
    if (yearSaving.value || yearLoading.value) return;
    const year = newYearInput.value.trim();
    if (!isValidYear(year)) return ElMessage.warning('请输入1000至9999的4位年份');
    if (yearList.value.includes(year)) return ElMessage.warning('该年度目录已存在');
    yearSaving.value = true;
    try {
        await api.createCompetitionYear({ year });
        newYearInput.value = '';
        await loadYears();
        current_page.value = 1;
        await handleSearch();
        ElMessage.success('添加成功');
    } catch (error) {
        console.error('新增年度失败：', error);
    } finally {
        yearSaving.value = false;
    }
};

const handleStartEdit = (index) => {
    yearTableData.value.forEach(item => item.isEditing = false);
    const row = yearTableData.value[index];
    row.isEditing = true;
    row.editValue = row.year;
};

const handleSaveEdit = async (index) => {
    if (yearSaving.value || yearLoading.value) return;
    const row = yearTableData.value[index];
    const newYear = row.editValue.trim();
    if (!isValidYear(newYear)) return ElMessage.warning('请输入1000至9999的4位年份');
    if (newYear === row.year) { row.isEditing = false; return; }
    if (yearList.value.includes(newYear)) return ElMessage.warning('该年度目录已存在');
    yearSaving.value = true;
    try {
        await api.updateCompetitionYear(row.year, { year: newYear });
        await loadYears(currentYear.value === row.year ? newYear : currentYear.value);
        current_page.value = 1;
        await handleSearch();
        ElMessage.success('修改成功');
    } catch (error) {
        console.error('修改年度失败：', error);
    } finally {
        yearSaving.value = false;
    }
};

const handleCancelEdit = (index) => {
    yearTableData.value[index].isEditing = false;
};

const handleDeleteYear = async (year) => {
    if (yearSaving.value || yearLoading.value) return;
    // 确认期间也禁用其他写操作，避免重复请求。
    yearSaving.value = true;
    try {
        await ElMessageBox.confirm(`确定要删除 ${year} 年度目录吗？`, '警告', {
            confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
        });
        await api.deleteCompetitionYear(year);
        await loadYears();
        current_page.value = 1;
        await handleSearch();
        ElMessage.success('删除成功');
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') console.error('删除年度失败：', error);
    } finally {
        yearSaving.value = false;
    }
};

// 跳转编辑页
const handleEdit = (row) => {
    if (!['school_admin', 'competition_manager'].includes(userStore.role)) {
        ElMessage.warning('当前账号无编辑权限');
        return;
    }
    const targetId = row?.id || row?.comp_id;
    if (!targetId) {
        ElMessage.error('未获取到赛事ID，无法进入编辑页');
        return;
    }
    router.push({ name: 'CompetitionEdit', params: { id: targetId } });
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
            console.error('删除失败:', error);
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
            console.error('批量删除失败:', error);
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
const total = ref(0);

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
    if (!currentYear.value) {
        tableData.value = [];
        total.value = 0;
        return;
    }
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
onMounted(async () => {
    loadCollegeList();
    try {
        await loadYears();
        await handleSearch();
    } catch (error) {
        console.error('加载年度目录失败：', error);
    }
});

</script>

<template>
    <div class="competition-container">
        <!-- 赛事列表头部搜索栏 -->
        <div class="filter-card">
            <el-form :inline="true" :model="searchForm" class="search-form">
                <el-form-item label="赛事名称">
                    <el-input v-model="searchForm.comp_name" placeholder="请输入赛事名称" clearable="true" style="width:220px"
                        maxlength="20" @keyup.enter="handleSearch" @clear="handleSearch"></el-input>
                </el-form-item>
                <el-form-item label="赛事级别">
                    <el-select v-model="searchForm.comp_level" placeholder="全部级别" clearable="true"
                        style="width: 220px" @change="handleSearch">
                        <el-option label="校级" value="校级"></el-option>
                        <el-option label="省级" value="省级"></el-option>
                        <el-option label="国家级" value="国家级"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="所属学院">
                    <el-select v-model="searchForm.college" placeholder="全部学院" clearable="true" style="width: 220px" @change="handleSearch">
                        <el-option v-for="college in collegeList" :key="college.id" :label="college.name"
                            :value="college.name"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="赛事负责人">
                    <el-input v-model="searchForm.manager" placeholder="请输入赛事负责人" clearable="true" style="width:220px"
                        maxlength="20" @keyup.enter="handleSearch" @clear="handleSearch"></el-input>
                </el-form-item>
                <el-form-item label="赛事状态">
                    <el-select v-model="searchForm.status" placeholder="全部状态" clearable="true" style="width: 220px;" @change="handleSearch">
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
                        :disabled="!currentYear || yearLoading" @click="handleAddCompetition">新增赛事</el-button>
                    <el-button v-if="userStore.role === 'college_admin'" type="primary" :icon="Plus"
                        @click="handleDeclare">
                        赛事申报
                    </el-button>
                    <el-button v-if="userStore.role === 'school_admin'" type="danger" plain :icon="Delete"
                        @click="handleBatchDelete">批量删除</el-button>
                    <el-button type="info" plain :icon="Download" :disabled="!currentYear || yearLoading" @click="handleExport">导出数据</el-button>
                    <el-button v-if="userStore.role === 'school_admin'" type="default" :icon="Upload"
                        plain :disabled="!currentYear || yearLoading" @click="handleImport">导入数据</el-button>
                </div>
                <div class="right-info">
                    <el-dropdown trigger="click" @command="handleYearCommand">
                        <div class="year-switch-tag">
                            <span class="tag-text">{{ currentYear ? `当前：${currentYear}年度赛事` : '暂无年度目录' }}</span>
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
                                <el-dropdown-item v-if="userStore.role === 'school_admin'" divided command="manage_years">
                                    <el-icon>
                                        <Setting />
                                    </el-icon> 管理年度目录
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
            <el-dialog v-model="yearManageVisible" title="年度目录管理" width="500px" align-center :close-on-click-modal="!yearSaving"
                :close-on-press-escape="!yearSaving" :show-close="!yearSaving">
                <el-alert title="仅空年度允许修改或删除；包含可恢复的已删除赛事也不能操作。" type="info" :closable="false" style="margin-bottom: 16px" />
                <div class="manage-header" style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <el-input :disabled="yearSaving || yearLoading" v-model="newYearInput" placeholder="输入年份 (如 2026)" style="flex: 1" maxlength="4"
                        clearable />
                    <el-button type="primary" :icon="Plus" :loading="yearSaving" :disabled="yearLoading" @click="handleAddYearInDialog">新增年份</el-button>
                </div>

                <el-table v-loading="yearLoading || yearSaving" :data="yearTableData" border stripe style="width: 100%" max-height="400">
                    <el-table-column prop="year" label="年份目录" align="center">
                        <template #default="scope">
                            <el-input :disabled="yearSaving" v-if="scope.row.isEditing" v-model="scope.row.editValue" size="small" autofocus />
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
                <!-- <el-table-column label="赛事编号" min-width="100" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.comp_code || '-' }}
                    </template>
                </el-table-column> -->
                <el-table-column label="赛事名称" min-width="150" show-overflow-tooltip align="center">
                    <template #default="scope">
                        {{ scope.row.comp_name || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="赛事级别" width="90" align="center">
                    <template #default="scope">
                        {{ scope.row.comp_level || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="主办单位" min-width="110" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.organizer || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="承办单位" min-width="110" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.undertaker || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="赛事负责人" width="100" align="center">
                    <template #default="scope">
                        {{ scope.row.manager?.realname || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="所属学院" min-width="140" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.college_info?.name || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="项目来源" min-width="80" align="center">
                    <template #default="scope">
                        {{ getSourceText(scope.row.source) }}
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="80" align="center">
                    <template #default="scope">
                        <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small" effect="plain">{{
                            scope.row.status === 1 ? '进行中' : scope.row.status === 2 ? '已结束' : '未开始' }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="150" align="center" fixed="right">
                    <template #default="scope">
                        <el-button v-if="['school_admin'].includes(userStore.role)" link type="primary" size="small" :icon="Edit"
                            @click="handleEdit(scope.row)">编辑</el-button>
                        <el-button v-if="['school_admin'].includes(userStore.role)" link type="danger" size="small" :icon="Delete"
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

/* 筛选卡片外壳用全局 .filter-card；此页筛选条件多会换行，仅保留行间距与按钮位覆盖 */
.filter-card {
    .search-form {
        .el-form-item {
            margin-bottom: 15px;
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
    border-radius: var(--card-radius);

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
                border-radius: var(--card-radius);
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
