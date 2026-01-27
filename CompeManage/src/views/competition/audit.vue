<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Check, Close, Edit, Delete, View, Promotion } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

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
};

// 加载状态
const loading = ref(false);

const multipleSelection = ref([]);

// 多选处理
const handleSelectionChange = (val) => {
    multipleSelection.value = val;
};

// 表格数据
// 审核状态字典：0-草稿(未提交), 1-待审核, 2-已通过(入库), 3-已驳回
// 模拟数据
const tableData = ref([
    {
        id: 1,
        comp_name: '2026年大学生结构设计竞赛校内选拔赛',
        comp_level: '校级',
        college: '土木工程学院',
        applicant: '张老师', // 申报人
        apply_time: '2025-01-20',
        audit_status: 1, // 待审核
        audit_comment: '',
        comp_type: '学科竞赛'
    },
    {
        id: 2,
        comp_name: '第十五届全国大学生电子商务“创新、创意及创业”挑战赛',
        comp_level: '国家级',
        college: '经济管理学院',
        applicant: '王主任',
        apply_time: '2025-01-21',
        audit_status: 1, // 待审核
        audit_comment: '',
        comp_type: '创新创业竞赛'
    },
    {
        id: 3,
        comp_name: '2026年ACM程序设计竞赛校队招新赛',
        comp_level: '校级',
        college: '计算机学院',
        applicant: '李教授',
        apply_time: '2025-01-18',
        audit_status: 0, // 草稿 (院管理员可见)
        audit_comment: '',
        comp_type: '学科竞赛'
    },
    {
        id: 4,
        comp_name: '已驳回的测试赛事申请',
        comp_level: '省级',
        college: '机械学院',
        applicant: '赵老师',
        apply_time: '2025-01-10',
        audit_status: 3, // 已驳回
        audit_comment: '附件缺失，请补充实施方案',
        comp_type: '学科竞赛'
    }
]);

// 根据角色和 Tab 过滤数据
const filteredTableData = computed(() => {
    return tableData.value.filter(item => {
        // Tab 过滤
        let tabMatch = false;
        if (currentRole.value === 'school_admin') {
            // 校管理员：Pending 看状态 1，History 看状态 2,3
            if (activeTab.value === 'pending') tabMatch = item.audit_status === 1;
            else tabMatch = [2, 3].includes(item.audit_status);
        } else {
            // 院管理员：Pending 看状态 0,1,3 (未完成流程的)，History 看状态 2 (已归档)
            if (activeTab.value === 'pending') tabMatch = [0, 1, 3].includes(item.audit_status);
            else tabMatch = item.audit_status === 2;
        }
        
        // 搜索条件过滤 (简单的模糊匹配)
        const nameMatch = !searchForm.comp_name || item.comp_name.includes(searchForm.comp_name);
        const collegeMatch = !searchForm.college || item.college === searchForm.college;

        return tabMatch && nameMatch && collegeMatch;
    });
});


// [校管理员] 通过审核
const handleApprove = (row) => {
    ElMessageBox.confirm(
        `确定通过 "${row.comp_name}" 吗？通过后将自动加入本年年度赛事目录。`,
        '通过审核',
        { confirmButtonText: '通过并发布', cancelButtonText: '取消', type: 'success' }
    ).then(() => {
        row.audit_status = 2; // 已通过
        ElMessage.success('审核通过，已合并至本年年度赛事目录');
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
    ).then(() => {
        multipleSelection.value.forEach(row => {
            row.audit_status = 2;
        });
        ElMessage.success('批量操作成功');
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
const confirmReject = () => {
    if (!rejectReason.value.trim()) {
        ElMessage.warning('请输入驳回原因');
        return;
    }
    // API调用模拟
    currentAuditRow.value.audit_status = 3;
    currentAuditRow.value.audit_comment = rejectReason.value;
    rejectDialogVisible.value = false;
    ElMessage.warning('已驳回该申请');
};

// [院管理员] 编辑
const handleEdit = (row) => {
    // TODO: 路由跳转，复用新增/编辑页面，带上 ID
};

// [院管理员] 提交审核
const handleSubmitAudit = (row) => {
    ElMessageBox.confirm(
        `确定将 "${row.comp_name}" 提交至校级审核吗？提交后不可修改。`,
        '提交确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
    ).then(() => {
        row.audit_status = 1; // 变更为待审核
        ElMessage.success('提交成功，请等待校级审核');
    }).catch(() => {});
};

// [院管理员] 删除草稿
const handleDeleteDraft = (row) => {
    ElMessageBox.confirm('确定删除该条申报记录吗？', '警告', { type: 'warning' })
        .then(() => {
            const index = tableData.value.findIndex(d => d.id === row.id);
            if(index > -1) tableData.value.splice(index, 1);
            ElMessage.success('删除成功');
        });
};

// [院管理员] 撤回审核
const handleRevoke = (row) => {
    row.audit_status = 0; // 变回草稿
    ElMessage.success('已撤回，可重新编辑');
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
                        <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院"></el-option>
                        <el-option label="土木工程学院" value="土木工程学院"></el-option>
                        <el-option label="经济管理学院" value="经济管理学院"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :icon="Search">搜索</el-button>
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

            <el-table v-loading="loading" :data="filteredTableData" stripe max-height="400" style="width: 100%"
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
                <el-table-column prop="applicant" label="申报人" width="100" align="center" />
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
                            <el-button link type="info" :icon="View" >详情</el-button>
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
                            <el-button link type="info" :icon="View" >详情</el-button>
                        </div>

                         <div v-else>
                            <el-button link type="primary" :icon="View">查看详情</el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
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
}

.filter-card,
.content-card {
    background-color: #fff;
    padding: 20px;
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
    margin: 10px 0;
    display: flex;
    justify-content: space-between;
}

.text-danger {
    color: var(--el-color-danger);
}
.text-gray {
    color: var(--el-text-color-secondary);
}


</style>