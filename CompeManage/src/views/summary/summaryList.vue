<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Edit, View, Search, Refresh, Download, ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
// import api from '@/api';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);

// 搜索表单数据
const searchForm = reactive({
    comp_name: '',
    organizer: '',
    manager: '',
    summary_status: '', // '' 全部, 0 未总结, 1 已归档
    end_time: '',
    year: '' // 年份字段
});

// 分页数据
const current_page = ref(1);
const page_size = ref(10);
const total = ref(100);

// 年份相关
const currentYear = ref(new Date().getFullYear().toString()); // 当前选中的年份
const yearList = ref(['2026', '2025', '2024', '2023']); // 可选年份列表

// 年份切换
const handleYearSwitch = (year) => {
    currentYear.value = year;
    searchForm.year = year;
    // 重置分页到第一页
    current_page.value = 1;
    // 重新加载数据
    handleSearch();
};

// 重置搜索表单
const handleReset = () => {
    searchForm.comp_name = '';
    searchForm.organizer = '';
    searchForm.manager = '';
    searchForm.summary_status = '';
    searchForm.end_time = '';
    current_page.value = 1;
    page_size.value = 10;
    handleSearch();
};

// 模拟数据：待总结只显示已结束且未填报的
const loadData = async () => {
    loading.value = true;
    // const params = { 
    //   status: 2, // 只查已结束的
    //   summary_status: searchForm.summary_status ? searchForm.summary_status : undefined
    // };
    // const res = await api.getCompetitionList(params);

    // 模拟数据演示
    setTimeout(() => {
        const allData = [
            { id: 101, comp_name: '2025年大学生程序设计竞赛', end_time: '2025-06-20', organizer: '计算机学院', undertaker: '计算机学院团委', college_info: { name: '计算机学院' }, manager: '张三', summary_status: 0 },
            { id: 102, comp_name: '2024年英语演讲比赛', end_time: '2024-12-10', organizer: '外国语学院', undertaker: '外国语学院学生会', college_info: { name: '外国语学院' }, manager: '李四', summary_status: 1 },
            { id: 103, comp_name: '2024年大学生挑战杯', end_time: '2024-11-30', organizer: '学生处', undertaker: '学生处竞赛部', college_info: { name: '学生处' }, manager: '王五', summary_status: 0 }
        ];

        // 根据筛选条件过滤数据
        let filtered = allData;
        if (searchForm.comp_name) {
            filtered = filtered.filter(item => item.comp_name.includes(searchForm.comp_name));
        }
        if (searchForm.organizer) {
            filtered = filtered.filter(item => item.organizer.includes(searchForm.organizer));
        }
        if (searchForm.manager) {
            filtered = filtered.filter(item => item.manager.includes(searchForm.manager));
        }
        if (searchForm.summary_status !== '') {
            filtered = filtered.filter(item => item.summary_status === parseInt(searchForm.summary_status));
        }

        total.value = filtered.length;
        // 分页处理
        const start = (current_page.value - 1) * page_size.value;
        const end = start + page_size.value;
        tableData.value = filtered.slice(start, end);

        loading.value = false;
    }, 500);
};

// 搜索功能
const handleSearch = async () => {
    current_page.value = 1;
    loadData();
};

// 分页处理
const handleSizeChange = (val) => {
    page_size.value = val;
    loadData();
};

const handleCurrentChange = (val) => {
    current_page.value = val;
    loadData();
};

const handleEdit = (row) => {
    router.push({
        name: 'SummaryEdit',
        params: { id: row.id },
        query: { 
            name: row.comp_name,
            status: row.summary_status // 传递状态: 0未总结, 1已归档
        }
    });
};

const handleView = (row) => {
    router.push({
        name: 'SummaryView',
        params: { id: row.id },
        query: { 
            name: row.comp_name,
            status: row.summary_status // 传递状态: 0未总结, 1已归档
        }
    });
};

const handleExport = () => {
    ElMessage.success('导出成功');
};

// 页面加载时初始化数据
onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="summary-list-container">
        <!-- 赛事总结搜索栏 -->
        <div class="search-container">
            <el-form :inline="true" :model="searchForm" class="search-form" label-width="100px" label-position="right">
                <el-form-item label="赛事名称">
                    <el-input v-model="searchForm.comp_name" placeholder="请输入赛事名称" clearable="true" style="width: 200px"
                        maxlength="50">
                    </el-input>
                </el-form-item>
                <el-form-item label="主办单位">
                    <el-input v-model="searchForm.organizer" placeholder="请输入主办单位" clearable="true" style="width: 200px"
                        maxlength="50">
                    </el-input>
                </el-form-item>
                <el-form-item label="赛事负责人">
                    <el-input v-model="searchForm.manager" placeholder="请输入赛事负责人" clearable="true" style="width: 200px"
                        maxlength="50">
                    </el-input>
                </el-form-item>
                <el-form-item label="总结状态">
                    <el-select v-model="searchForm.summary_status" placeholder="请选择总结状态" clearable="true"
                        style="width: 200px">
                        <el-option label="未总结" value="0"></el-option>
                        <el-option label="已归档" value="1"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item class="search-actions">
                    <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
                    <el-button type="default" :icon="Refresh" plain @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>
        </div>

        <!-- 赛事总结列表表格 -->
        <div class="summary-table-container">
            <div class="table-toolbar">
                <div class="left-actions">
                    <el-button type="info" plain :icon="Download" @click="handleExport">导出数据</el-button>
                </div>
                <div class="right-info">
                    <el-dropdown trigger="click" @command="handleYearSwitch">
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
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>

            <el-table v-loading="loading" :data="tableData" stripe style="width: 100%" height="400">
                <el-table-column prop="comp_name" label="赛事名称" min-width="200" show-overflow-tooltip align="center" />
                <el-table-column prop="organizer" label="主办单位" min-width="150" show-overflow-tooltip align="center" />
                <el-table-column prop="undertaker" label="承办单位" min-width="150" show-overflow-tooltip align="center" />
                <el-table-column label="所属学院" min-width="150" align="center" show-overflow-tooltip>
                    <template #default="scope">
                        {{ scope.row.college_info?.name || '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="manager" label="赛事负责人" width="150" align="center" />
                <el-table-column prop="end_time" label="结束时间" width="150" sortable align="center" />

                <el-table-column label="总结状态" width="120" align="center">
                    <template #default="scope">
                        <el-tag v-if="scope.row.summary_status === 1" type="success">已归档</el-tag>
                        <el-tag v-else type="warning">未总结</el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="150" align="center" fixed="right">
                    <template #default="scope">
                        <el-button v-if="scope.row.summary_status === 0" type="primary" link :icon="Edit"
                            @click="handleEdit(scope.row)">
                            去总结
                        </el-button>
                        <el-button v-else type="primary" link :icon="View" @click="handleView(scope.row)">
                            查看详情
                        </el-button>
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
.summary-list-container {
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

.summary-table-container {
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