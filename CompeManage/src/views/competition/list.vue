<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Download, Upload, Plus, Delete, ArrowDown, Edit, Setting } from '@element-plus/icons-vue';


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
};

// 表格模拟数据
const tableData = ref([
    {
        id: 1,
        comp_code: 'XS2025001',
        comp_name: '2025年广州大学校级ACM程序设计竞赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学ACM',
        manager: '李教授',
        project_source: '学校录入',
        status: '进行中',
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 2,
        comp_code: 'XS2025002',
        comp_name: '2025年广州大学校级大学生创新创业训练计划项目（大创）',
        comp_type: '创新创业竞赛',
        comp_level: '校级',
        organizer: '广州大学创新创业学院',
        undertaker: '广州大学教务处',
        manager: '王老师',
        project_source: '学校录入',
        status: '已结束',
        college: '创新创业学院',
        year: '2025'
    },
    {
        id: 3,
        comp_code: 'XS2025003',
        comp_name: '2025年广州大学校级蓝桥杯软件和信息技术专业人才大赛模拟赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学软件工程系',
        manager: '张讲师',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
    {
        id: 1,
        comp_code: 'XS2025001',
        comp_name: '2025年广州大学校级ACM程序设计竞赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学ACM',
        manager: '李教授',
        project_source: '学校录入',
        status: '进行中',
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 2,
        comp_code: 'XS2025002',
        comp_name: '2025年广州大学校级大学生创新创业训练计划项目（大创）',
        comp_type: '创新创业竞赛',
        comp_level: '校级',
        organizer: '广州大学创新创业学院',
        undertaker: '广州大学教务处',
        manager: '王老师',
        project_source: '学校录入',
        status: '已结束',
        college: '创新创业学院',
        year: '2025'
    },
    {
        id: 3,
        comp_code: 'XS2025003',
        comp_name: '2025年广州大学校级蓝桥杯软件和信息技术专业人才大赛模拟赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学软件工程系',
        manager: '张讲师',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
    {
        id: 1,
        comp_code: 'XS2025001',
        comp_name: '2025年广州大学校级ACM程序设计竞赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学ACM',
        manager: '李教授',
        project_source: '学校录入',
        status: '进行中',
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 2,
        comp_code: 'XS2025002',
        comp_name: '2025年广州大学校级大学生创新创业训练计划项目（大创）',
        comp_type: '创新创业竞赛',
        comp_level: '校级',
        organizer: '广州大学创新创业学院',
        undertaker: '广州大学教务处',
        manager: '王老师',
        project_source: '学校录入',
        status: '已结束',
        college: '创新创业学院',
        year: '2025'
    },
    {
        id: 3,
        comp_code: 'XS2025003',
        comp_name: '2025年广州大学校级蓝桥杯软件和信息技术专业人才大赛模拟赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学软件工程系',
        manager: '张讲师',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
])

// 加载状态
const loading = ref(false);

// 路由实例
const router = useRouter();

// 新增赛事
const handleAddCompetition = () => {
    router.push({ name: 'CompetitionAdd' });
};

// 年份管理数据
const currentYear = ref('2025'); // 当前选中的年份
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
const handleDelete = (row) => {
    ElMessageBox.confirm(
        `确定要删除 "${row.comp_name}" 吗?`,
        '警告',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
        //TODO: 调用删除接口
        ElMessage.success('删除成功');
    }).catch(() => { });
};

// TODO:批量删除


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
                        <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院"></el-option>
                        <el-option label="电子信息工程学院" value="电子信息工程学院"></el-option>
                        <el-option label="经济管理学院" value="经济管理学院"></el-option>
                        <el-option label="创新创业学院" value="创新创业学院"></el-option>
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
                    <el-button type="primary" :icon="Search" plain>搜索</el-button>
                    <el-button type="default" :icon="Refresh" plain @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>
        </div>

        <!-- 赛事列表表格 -->
        <div class="competition-table-container">
            <div class="table-toolbar">
                <div class="left-actions">
                    <el-button type="primary" :icon="Plus" @click="handleAddCompetition">新增赛事</el-button>
                    <el-button type="danger" plain :icon="Delete">批量删除</el-button>
                    <el-button type="info" plain :icon="Download">导出数据</el-button>
                    <el-button type="default" :icon="Upload" plain>导入数据</el-button>
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
                            <el-input v-if="scope.row.isEditing" v-model="scope.row.editValue" size="small" autofocus/>
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

            <el-table v-loading="loading" :data="tableData" stripe max-height="400"
                style="width: 100%">
                <el-table-column type="selection" width="40" />
                <el-table-column prop="id" label="序号" width="60" align="center"></el-table-column>
                <el-table-column prop="comp_code" label="竞赛编号" min-width="100" align="center"></el-table-column>
                <el-table-column prop="comp_name" label="竞赛名称" min-width="200" show-overflow-tooltip
                    align="center"></el-table-column>
                <el-table-column prop="comp_level" label="竞赛级别" width="100" align="center"></el-table-column>
                <el-table-column prop="organizer" label="主办单位" min-width="150" align="center"
                    show-overflow-tooltip></el-table-column>
                <el-table-column prop="undertaker" label="承办单位" min-width="150" align="center"
                    show-overflow-tooltip></el-table-column>
                <el-table-column prop="manager" label="赛事负责人" width="100" align="center"></el-table-column>
                <el-table-column prop="college" label="所属学院" width="150" align="center"></el-table-column>
                <el-table-column prop="project_source" label="项目来源" min-width="90" align="center"></el-table-column>
                <el-table-column prop="status" label="状态" width="90" align="center">
                    <template #default="scope">
                        <el-tag :type="scope.row.status === '进行中' ? 'success' : 'info'" size="small" effect="plain">{{
                            scope.row.status }}</el-tag>
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
            <div v-if="tableData.length > 0" class="pagination-wrapper">
                <el-pagination v-model:current-page="current_page" v-model:page-size="page_size"
                    :page-sizes="[10, 20, 30, 50]" layout="total, sizes, prev, pager, next, jumper" :total="400"
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
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
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
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
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
    margin-left: 20px;


}
</style>