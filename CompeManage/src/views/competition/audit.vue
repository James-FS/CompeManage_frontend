<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Check, Close, Edit, Delete, View, Promotion } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import api from '@/api';

const router = useRouter();
const userStore = useUserStore();
// 从用户存储中获取当前用户角色
const currentRole = computed(() => userStore.role);

// 顶部 Tab 选项卡
const activeTab = ref('pending'); // pending: 待审核/草稿, history: 审核记录/已发布

// 搜索表单数据
const searchForm = reactive({
    comp_name: '',
    college: '',
    status: '', // 审核状态
});

// 重置搜索
const handleReset = () => {
    searchForm.comp_name = '';
    searchForm.college = '';
    searchForm.status = '';
    
    // 重置分页
    current_page.value = 1;
    page_size.value = 10;
    
    // 重新搜索
    handleSearch();
};

// 加载状态
const loading = ref(false);

const multipleSelection = ref([]);
const collegeList = ref([]);

// 多选处理
const handleSelectionChange = (val) => {
    multipleSelection.value = val;
};

// 分页数据
const current_page = ref(1);
const page_size = ref(10);
const total = ref(0);

// 分页处理
const handleSizeChange = (val) => {
    page_size.value = val;
    handleSearch();
};
const handleCurrentChange = (val) => {
    current_page.value = val;
    handleSearch();
};

// 表格数据
// 审核状态字典：0-草稿(未提交), 1-待审核, 2-已通过(入库), 3-已驳回
const tableData = ref([]);

// 搜索和获取列表
const handleSearch = async () => {
    loading.value = true;
    try {
        let res;
        
        if (currentRole.value === 'school_admin') {
            // 校级管理员：根据 Tab 调用不同接口
            if (activeTab.value === 'pending') {
                // 待审核申报
                res = await api.getPendingDeclares({
                    page: current_page.value,
                    page_size: page_size.value,
                    comp_name: searchForm.comp_name,
                    comp_level: searchForm.comp_level,
                    college_id: searchForm.college || undefined
                });
            } else {
                // 审核记录（已审核）
                res = await api.getAuditedDeclares({
                    page: current_page.value,
                    page_size: page_size.value,
                    comp_name: searchForm.comp_name,
                    comp_level: searchForm.comp_level,
                    college_id: searchForm.college || undefined
                });
            }
        } else {
            // 院级管理员：根据 Tab 调用不同接口
            if (activeTab.value === 'pending') {
                // 我的待审核申报
                res = await api.getMyPendingDeclares({
                    page: current_page.value,
                    page_size: page_size.value,
                    comp_name: searchForm.comp_name,
                    comp_level: searchForm.comp_level
                });
            } else {
                // 我的已发布申报
                res = await api.getMyPublishedDeclares({
                    page: current_page.value,
                    page_size: page_size.value,
                    comp_name: searchForm.comp_name,
                    comp_level: searchForm.comp_level
                });
            }
        }
        
        if (res.code === 200 && res.data) {
            // 转换 API 数据格式
            tableData.value = res.data.items.map(item => ({
                id: item.id,
                comp_name: item.comp_name,
                comp_level: item.comp_level,
                college: item.college_info?.name || '',
                applicant: item.declarer?.realname || '',
                apply_time: new Date(item.create_time).toLocaleDateString('zh-CN'),
                audit_status: item.declare_status,
                audit_comment: item.audit_remark || '',
                comp_type: item.comp_type,
                manager: item.manager?.realname || ''
            }));
            total.value = res.data.total || 0;
        }
    } catch (error) {
        ElMessage.error('获取申报列表失败');
        console.error(error);
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

// 直接使用后端返回的数据（两种角色都已按 Tab 返回对应数据）
const filteredTableData = computed(() => {
    return tableData.value;
});


// [校管理员] 通过审核
const handleApprove = (row) => {
    ElMessageBox.confirm(
        `确定通过 "${row.comp_name}" 吗？通过后将自动加入本年年度赛事目录。`,
        '通过审核',
        { confirmButtonText: '通过并发布', cancelButtonText: '取消', type: 'success' }
    ).then(async () => {
        try {
            const res = await api.auditDeclare({
                declare_id: row.id,
                audit_status: 2,
                audit_remark: ''
            });
            if (res.code === 200) {
                ElMessage.success('审核通过，已合并至本年年度赛事目录');
                // 刷新列表
                await handleSearch();
            }
        } catch (error) {
            ElMessage.error('审核失败');
            console.error(error);
        }
    }).catch(() => {});
};

// [校管理员] 批量通过
const handleBatchApprove = () => {
    if (multipleSelection.value.length === 0) {
        ElMessage.warning('请先勾选需要通过的赛事');
        return;
    }
    ElMessageBox.confirm(
        `确定批量通过这 ${multipleSelection.value.length} 项赛事吗？`,
        '批量审核',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'success' }
    ).then(async () => {
        try {
            // 逐个调用审核接口
            const promises = multipleSelection.value.map(row =>
                api.auditDeclare({
                    declare_id: row.id,
                    audit_status: 2,
                    audit_remark: ''
                })
            );
            await Promise.all(promises);
            ElMessage.success('批量操作成功');
            // 清空选中并刷新列表
            multipleSelection.value = [];
            await handleSearch();
        } catch (error) {
            ElMessage.error('批量审核失败');
            console.error(error);
        }
    }).catch(() => { });
};

// [校管理员] 驳回审核
// 驳回对话框状态
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const currentAuditRow = ref(null);

// 打开驳回对话框
const openRejectDialog = (row) => {
    currentAuditRow.value = row;
    rejectReason.value = '';
    rejectDialogVisible.value = true;
};

// 确认驳回
const confirmReject = async () => {
    if (!rejectReason.value.trim()) {
        ElMessage.warning('请输入驳回原因');
        return;
    }
    try {
        const res = await api.auditDeclare({
            declare_id: currentAuditRow.value.id,
            audit_status: 3,
            audit_remark: rejectReason.value
        });
        if (res.code === 200) {
            rejectDialogVisible.value = false;
            ElMessage.warning('已驳回该申请');
            // 刷新列表
            await handleSearch();
        }
    } catch (error) {
        ElMessage.error('驳回失败');
        console.error(error);
    }
};

// [院管理员] 编辑
const handleEdit = (row) => {
    router.push({
        name: 'CompetitionDeclare',
        query: { id: row.id }
    });
};

// [院管理员] 提交审核
const handleSubmitAudit = (row) => {
    ElMessageBox.confirm(
        `确定将 "${row.comp_name}" 提交至校级审核吗？提交后不可修改。`,
        '提交确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
    ).then(async () => {
        try {
            const res = await api.submitDeclare(row.id);
            if (res.code === 200) {
                ElMessage.success('提交成功，请等待校级审核');
                // 刷新列表
                await handleSearch();
            }
        } catch (error) {
            ElMessage.error('提交失败');
            console.error(error);
        }
    }).catch(() => {});
};

// [院管理员] 删除草稿
const handleDeleteDraft = (row) => {
    ElMessageBox.confirm(
        `确定删除 "${row.comp_name}" 的申报吗？删除后将无法恢复。`,
        '删除确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
        .then(async () => {
            try {
                const res = await api.deleteDeclare(row.id);
                if (res.code === 200) {
                    ElMessage.success('申报已删除');
                    // 刷新列表
                    await handleSearch();
                }
            } catch (error) {
                ElMessage.error('删除失败');
                console.error(error);
            }
        }).catch(() => {});
};

// [院管理员] 撤回审核
const handleRevoke = (row) => {
    ElMessageBox.confirm(
        `确定撤回 "${row.comp_name}" 的申报吗？撤回后可重新编辑。`,
        '撤回确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
        try {
            const res = await api.revokeDeclare(row.id);
            if (res.code === 200) {
                ElMessage.success('申报已撤回，可重新编辑');
                // 刷新列表
                await handleSearch();
            }
        } catch (error) {
            ElMessage.error('撤回失败');
            console.error(error);
        }
    }).catch(() => {});
};

// 查看申报详情
const handleViewDetail = (row) => {
    router.push({
        name: 'CompetitionDeclare',
        query: { id: row.id }
    });
};


// 辅助函数：审核状态标签颜色
const getStatusTagType = (status) => {
    const map = {
        0: 'info',      // 草稿
        1: 'warning',   // 待审核
        2: 'success',   // 已通过
        3: 'danger'     // 已驳回
    };
    return map[status] || 'info';
};
// 辅助函数：审核状态文本
const getStatusText = (status) => {
    const map = {
        0: '草稿',
        1: '待审核',
        2: '已通过',
        3: '已驳回'
    };
    return map[status] || '未知';
};

// 生命周期
onMounted(() => {
    loadCollegeList();
    handleSearch();
});

// 监听 Tab 切换，重新加载数据
watch(() => activeTab.value, () => {
    current_page.value = 1; // 重置分页
    handleSearch();
});
</script>

<template>
    <div class="audit-container">
        <div class="filter-card">
            <el-form :inline="true" :model="searchForm" class="search-form">
                <el-form-item label="赛事名称">
                    <el-input v-model="searchForm.comp_name" placeholder="搜索赛事名称" clearable style="width: 220px" />
                </el-form-item>
                <el-form-item label="所属学院" v-if="currentRole === 'school_admin'">
                    <el-select v-model="searchForm.college" placeholder="选择学院" clearable style="width: 220px">
                        <el-option
                            v-for="college in collegeList"
                            :key="college.id"
                            :label="college.name"
                            :value="college.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
                    <el-button :icon="Refresh" @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>
        </div>

        <div class="content-card">
            <el-tabs v-model="activeTab" class="custom-tabs">
                <el-tab-pane :label="currentRole === 'school_admin' ? '待审核申报' : '我的申报列表'" name="pending"></el-tab-pane>
                <el-tab-pane :label="currentRole === 'school_admin' ? '审核记录' : '已发布/历史'" name="history"></el-tab-pane>
            </el-tabs>

            <div class="toolbar">
                <div class="left-actions">
                    <template v-if="currentRole === 'school_admin' && activeTab === 'pending'">
                        <el-button type="success" :icon="Check" @click="handleBatchApprove"
                            :disabled="multipleSelection.length === 0">
                            批量通过
                        </el-button>
                    </template>

                    <template v-if="currentRole === 'college_admin' && activeTab === 'pending'">
                        <el-button type="primary" :icon="Promotion" @click="router.push({ name: 'CompetitionDeclare' })">
                            新增申报
                        </el-button>
                    </template>
                </div>
            </div>

            <el-table v-loading="loading" :data="filteredTableData" stripe height="calc(100vh - 390px)"  style="width: 100%"
                @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="50" align="center" />
                <el-table-column label="状态" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag :type="getStatusTagType(row.audit_status)" effect="plain" disable-transitions="true">
                            {{ getStatusText(row.audit_status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="comp_name" label="赛事名称" min-width="220" show-overflow-tooltip align="center"/>
                <el-table-column prop="comp_level" label="级别" width="100" align="center" />
                <el-table-column prop="college" label="申报学院" width="160" align="center" />
                <el-table-column v-if="currentRole === 'school_admin'" prop="applicant" label="申报人" width="100" align="center" />
                <el-table-column prop="manager" label="赛事负责人" width="100" align="center" />
                <el-table-column prop="apply_time" label="申报时间" width="120" align="center" />
                <el-table-column label="备注/原因" min-width="150" show-overflow-tooltip align="center">
                    <template #default="{ row }">
                        <span v-if="row.audit_status === 3" class="text-danger">{{ row.audit_comment }}</span>
                        <span v-else class="text-gray">-</span>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="220" align="center" fixed="right">
                    <template #default="{ row }">
                        <div v-if="currentRole === 'school_admin' && row.audit_status === 1">
                            <el-button link type="info" :icon="View" @click="handleViewDetail(row)">详情</el-button>
                            <el-button link type="success" :icon="Check" @click="handleApprove(row)">通过</el-button>
                            <el-button link type="danger" :icon="Close" @click="openRejectDialog(row)">驳回</el-button>
                        </div>

                        <div v-else-if="currentRole === 'college_admin' && [0, 3].includes(row.audit_status)">
                            <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
                            <el-button link type="success" :icon="Promotion" @click="handleSubmitAudit(row)">提交</el-button>
                            <el-button link type="danger" :icon="Delete" @click="handleDeleteDraft(row)">删除</el-button>
                        </div>

                        <div v-else-if="currentRole === 'college_admin' && row.audit_status === 1">
                            <el-button link type="warning" :icon="Refresh" @click="handleRevoke(row)">撤回</el-button>
                            <el-button link type="info" :icon="View" @click="handleViewDetail(row)">详情</el-button>
                        </div>

                         <div v-else>
                            <el-button link type="primary" :icon="View" @click="handleViewDetail(row)">查看详情</el-button>
                        </div>
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

        <el-dialog v-model="rejectDialogVisible" title="驳回申请" width="400px">
            <el-input
                v-model="rejectReason"
                type="textarea"
                rows="4"
                placeholder="请输入驳回原因（如：附件缺失、级别填写错误等）"
            />
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="rejectDialogVisible = false">取消</el-button>
                    <el-button type="danger" @click="confirmReject">确认驳回</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.audit-container {
    padding: 20px;
    min-height: 100%;
    box-sizing: border-box;
}

.filter-card{
    background-color: #fff;
    padding: 20px;
    border-radius: 4px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}
.content-card {
    background-color: #fff;
    padding: 20px 20px 10px 20px;
    border-radius: 4px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    
}

.filter-card {
    margin-bottom: 15px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.toolbar {
    display: flex;
    justify-content: space-between;
}

.text-danger {
    color: var(--el-color-danger);
}
.text-gray {
    color: var(--el-text-color-secondary);
}

.pagination-wrapper {
    margin-top: 10px;
    display: flex;
    justify-content: center;
}


</style>