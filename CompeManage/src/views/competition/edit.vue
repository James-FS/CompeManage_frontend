<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { debounce } from '@/utils/debounce';
import api from '@/api/index';

const router = useRouter();
const route = useRoute();
const compId = route.params.id;

const formRef = ref(null);
const loading = ref(false);
const collegeList = ref([]);
const departmentList = ref([]);

const form = reactive({
    comp_name: '',
    comp_level: '',
    comp_type: '',
    organizer: '',
    undertaker: '',
    manager: '',
    manager_id: '',
    college: '',
    desc: '',
    year: ''
});

const rules = {
    comp_name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
    comp_level: [{ required: true, message: '请选择赛事级别', trigger: 'change' }],
    college: [{ required: true, message: '请选择所属学院', trigger: 'change' }],
    manager: [{ required: true, message: '请选择赛事负责人', trigger: 'change' }],
    year: [{ required: true, message: '请输入所属年份', trigger: 'blur' }]
};

const managerDialogVisible = ref(false);
const managerLoading = ref(false);
const teacherList = ref([]);
const managerCurrentPage = ref(1);
const managerPageSize = ref(10);
const managerTotal = ref(0);

const searchForm = reactive({
    name: '',
    work_id: '',
    college: ''
});

const loadColleges = async () => {
    try {
        const res = await api.getCollegeList();
        if (res.code === 0 || res.code === 200) {
            collegeList.value = res.data || [];
        }
    } catch (error) {
        console.error('加载学院失败:', error);
    }
};

async function loadDepartments() {
    try {
        const res = await api.getDepartmentList()
        if (res.code === 0 || res.code === 200) {
            departmentList.value = res.data || []
        }
    } catch (e) {
        console.error('加载部门列表失败', e)
    }
}

const loadDetail = async () => {
    if (!compId) {
        ElMessage.error('赛事ID缺失，无法获取详情');
        return;
    }

    loading.value = true;
    try {
        const res = await api.getCompetitionDetail(compId);
        const data = res?.data;
        if (!data) {
            ElMessage.error(res?.msg || res?.message || '获取赛事详情失败');
            return;
        }

        const managerInfo = data.manager || {};
        const collegeInfo = data.college_info || {};

        form.comp_name = data.comp_name || '';
        form.comp_level = data.comp_level || '';
        form.comp_type = data.comp_type || '';
        form.organizer = data.organizer || '';
        form.undertaker = data.undertaker || '';
        form.manager = managerInfo.realname || '';
        form.manager_id = data.manager_id || managerInfo.id || '';
        form.college = collegeInfo.name || '';
        form.desc = data.desc || '';
        form.year = data.year ? String(data.year) : '';
    } catch (error) {
        console.error(error);
        ElMessage.error('获取赛事详情失败');
    } finally {
        loading.value = false;
    }
};

const getManagerList = async () => {
    managerLoading.value = true;
    try {
        const res = await api.getManagerList({
            name: searchForm.name,
            work_id: searchForm.work_id,
            college: searchForm.college,
            page: managerCurrentPage.value,
            page_size: managerPageSize.value
        });
        if (res.code === 200) {
            teacherList.value = res.data?.list || [];
            managerTotal.value = res.data?.total || 0;
        } else {
            ElMessage.error(res.msg || '获取负责人列表失败');
        }
    } catch (error) {
        ElMessage.error('获取负责人列表失败，请稍后重试');
        console.error('获取负责人列表失败:', error);
    } finally {
        managerLoading.value = false;
    }
};

const debouncedSearch = debounce(() => {
    managerCurrentPage.value = 1;
    getManagerList();
}, 500);

const openManagerSelect = () => {
    managerDialogVisible.value = true;
    getManagerList();
};

const selectTeacher = (row) => {
    form.manager = row.name;
    form.manager_id = row.id;
    managerDialogVisible.value = false;
    ElMessage.success(`已选择负责人：${row.name}`);
};

const handleManagerSizeChange = (val) => {
    managerPageSize.value = val;
    managerCurrentPage.value = 1;
    getManagerList();
};

const handleManagerCurrentChange = (val) => {
    managerCurrentPage.value = val;
    getManagerList();
};

const resetSearch = () => {
    searchForm.name = '';
    searchForm.work_id = '';
    searchForm.college = '';
    managerCurrentPage.value = 1;
    getManagerList();
};

const handleSubmit = async (formEl) => {
    if (!formEl) return;
    await formEl.validate(async (valid) => {
        if (!valid) return;

        if (!compId) {
            ElMessage.error('赛事ID缺失，无法更新');
            return;
        }

        try {
            loading.value = true;
            await api.updateCompetition(compId, {
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
            ElMessage.success('修改成功！');
            router.push({ name: 'CompetitionList' });
        } catch (error) {
            console.error('更新赛事失败:', error);
            ElMessage.error(error?.message || '修改失败');
        } finally {
            loading.value = false;
        }
    });
};

const handleCancel = () => {
    router.back();
};

onMounted(async () => {
    await loadColleges();
    loadDepartments();
    if (compId) {
        await loadDetail();
    }
});
</script>

<template>
    <div class="edit-container" v-loading="loading">
        <el-card class="form-card">
            <template #header>
                <div class="card-header">
                    <span>编辑赛事信息</span>
                </div>
            </template>
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
                            <el-select v-model="form.college" placeholder="请选择学院" style="width: 100%" clearable>
                                <el-option v-for="college in collegeList" :key="college.id" :label="college.name"
                                    :value="college.name" />
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
                            <el-input v-model="form.manager" placeholder="请选择赛事负责人" readonly class="manager-input"
                                @click="openManagerSelect" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="所属年份" prop="year">
                            <el-input v-model="form.year" placeholder="请输入所属年份" />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="备注说明" prop="desc">
                    <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="填写赛事的其他补充说明..." />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSubmit(formRef)">保存</el-button>
                    <el-button @click="handleCancel">取消</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>

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
                <el-form-item label="所属部门">
                    <el-select v-model="searchForm.college" placeholder="选择部门" clearable @change="getManagerList"
                        @clear="getManagerList" popper-class="dept-select-popper" style="width: 330px;">
                        <el-option v-for="dept in departmentList" :key="dept.id"
                            :label="dept.name" :value="dept.name" />
                    </el-select>
                </el-form-item>
            </el-form>
        </div>
        <el-table :data="teacherList" border stripe v-loading="managerLoading" height="350" style="width: 100%">
            <el-table-column prop="work_id" label="工号" width="120" align="center" />
            <el-table-column prop="name" label="姓名" width="120" align="center" />
            <el-table-column prop="college" label="所属部门" min-width="200" align="center" />
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
.edit-container {
    padding: 20px;
    box-sizing: border-box;
    background-color: var(--background-color);
}

.form-card {
    max-width: 1000px;
    margin: 0 auto;
}

.manager-input {
    cursor: pointer;
}

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

.pagination-wrapper {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}
</style>