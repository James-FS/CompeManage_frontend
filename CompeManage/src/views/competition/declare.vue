<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
    Check, ArrowLeft, Close,
    UploadFilled
} from '@element-plus/icons-vue';
import { debounce } from '@/utils/debounce';
import api from '@/api';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const formRef = ref(null);
const isEditMode = ref(false); // 是否为编辑模式
const isReadOnly = ref(false); // 是否为只读模式（已通过的申报）

// 表单数据
const form = reactive({
    comp_name: '',
    comp_level: '',
    comp_type: '',
    comp_date: '',
    location: '',
    organizer: '',
    manager: '',
    manager_id: '',
    college: '',
    description: '',
    attachments: [],
    undertaker: ''
});

// 验证规则 
const rules = {
    comp_name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
    comp_level: [{ required: true, message: '请选择赛事等级', trigger: 'change' }],
    comp_type: [{ required: true, message: '请选择赛事类型', trigger: 'change' }],
    college: [{ required: true, message: '请选择所属学院', trigger: 'change' }],
    manager: [{ required: true, message: '请输入赛事负责人', trigger: 'change' }],
    organizer: [{ required: true, message: '请输入主办单位', trigger: 'blur' }],
    undertaker: [{ required: true, message: '请输入承办单位', trigger: 'blur' }],
};

// 选项数据
const levelOptions = [
    { label: '校级', value: '校级' },
    { label: '省级', value: '省级' },
    { label: '国家级', value: '国家级' },
    { label: '国际级', value: '国际级' }
];

const typeOptions = [
    { label: '学科竞赛', value: '学科竞赛' },
    { label: '创新创业竞赛', value: '创新创业竞赛' },
    { label: '体育竞赛', value: '体育竞赛' },
    { label: '其他', value: '其他' }
];

const collegeList = ref([]);

// 负责人弹窗相关
const managerDialogVisible = ref(false); // 控制弹窗显示
const managerLoading = ref(false);       // 表格加载状态
const teacherList = ref([]);             // 教师列表数据
const managerCurrentPage = ref(1);       // 当前页
const managerPageSize = ref(10);         // 每页大小
const managerTotal = ref(0);             // 总数

// 搜索表单
const searchForm = reactive({
    name: '',
    work_id: '',
    college: ''
});

// 生命周期
onMounted(async () => {
    await loadColleges();
    // 如果有 id 参数，则加载申报详情（编辑模式）
    const declareId = route.query.id;
    if (declareId) {
        await loadDeclareDetail(declareId);
        isEditMode.value = true;
    }
});

// 加载学院列表
const loadColleges = async () => {
    try {
        const res = await api.getCollegeList();
        if (res.code === 0 || res.code === 200) {
            collegeList.value = res.data || [];
        } else {
            ElMessage.error('加载学院列表失败');
        }
    } catch (error) {
        ElMessage.error('加载学院列表失败');
    }
};

// 加载申报详情（编辑模式）
const loadDeclareDetail = async (id) => {
    try {
        const res = await api.getDeclareDetail(id);
        if (res.code === 200) {
            const data = res.data;
            form.comp_name = data.comp_name;
            form.comp_level = data.comp_level;
            form.comp_type = data.comp_type;
            form.organizer = data.organizer;
            form.undertaker = data.undertaker;
            form.college = data.college_id; // 存储学院 ID
            form.manager = data.manager?.realname || ''; // 显示负责人名称
            form.manager_id = data.manager_id; // 存储负责人 ID
            // 将年份转换为 Date 对象给日期选择器使用
            form.comp_date = new Date(data.year, 0, 1);
            form.description = data.desc;
            form.attachments = parseAttachmentUrls(data.attachment_path);
            
            // 只有草稿(0)和被驳回(3)的申报才允许编辑，其他状态禁用
            // 状态：0-草稿, 1-已提交, 2-已通过, 3-已驳回
            if (data.declare_status !== 0 && data.declare_status !== 3) {
                isReadOnly.value = true; // 设置为只读模式
                // 禁用表单的所有字段
                const inputs = formRef.value?.$el?.querySelectorAll('input, select, textarea');
                inputs?.forEach(el => {
                    el.disabled = true;
                });
            } else {
                isReadOnly.value = false; // 允许编辑模式
            }
        }
    } catch (error) {
        ElMessage.error('加载申报详情失败');
    }
};

const goBack = () => router.back();

// 取消操作（带确认框）
const handleCancel = () => {
    ElMessageBox.confirm(
        '确定要取消吗？未保存的内容将丢失',
        '取消确认',
        {
            confirmButtonText: '确认取消',
            cancelButtonText: '继续编辑',
            type: 'warning',
        }
    ).then(() => {
        router.back();
    }).catch(() => {
        // 用户点击了"继续编辑"，不做任何操作
    });
};

// 保存申报
const handleSave = async (formEl) => {
    if (!formEl) return;

    await formEl.validate(async (valid) => {
        if (valid) {
            loading.value = true;
            try {
                const attachmentUrls = await uploadAttachmentsIfNeeded();
                if (!attachmentUrls) {
                    loading.value = false;
                    return;
                }
                // 从 Date 对象中提取年份
                let year = new Date().getFullYear();
                if (form.comp_date instanceof Date) {
                    year = form.comp_date.getFullYear();
                } else if (typeof form.comp_date === 'number') {
                    year = form.comp_date;
                }

                const payload = {
                    comp_name: form.comp_name,
                    comp_level: form.comp_level,
                    comp_type: form.comp_type,
                    organizer: form.organizer,
                    undertaker: form.undertaker,
                    college_id: form.college,
                    manager_id: form.manager_id,
                    year: year,
                    desc: form.description,
                    attachment_path: attachmentUrls.join(',')
                };

                let res;
                if (isEditMode.value && route.query.id) {
                    // 编辑模式：更新申报
                    res = await api.updateDeclare(route.query.id, payload);
                } else {
                    // 创建模式：创建新申报
                    res = await api.createDeclare(payload);
                }

                if (res.code === 200) {
                    ElMessage.success({
                        message: '保存成功',
                        plain: true,
                    });
                    // 保存成功后跳转到审核页面
                    router.push('/competition/audit');
                }
                loading.value = false;
            } catch (error) {
                loading.value = false;
                ElMessage.error('保存失败，请重试');
            }
        } else {
            ElMessage.warning('请填写完整的必填项');
            return false;
        }
    });
};

const getDisplayFileName = (url) => {
    if (!url) return '';
    const fileName = url.split('/').pop() || '';
    if (fileName.includes('_')) {
        return fileName.substring(fileName.indexOf('_') + 1) || fileName;
    }
    return fileName;
};

const parseAttachmentUrls = (urlStr) => {
    if (!urlStr) return [];
    return urlStr.split(',').filter(Boolean).map((url) => ({
        name: getDisplayFileName(url),
        url
    }));
};

const uploadAttachmentsIfNeeded = async () => {
    const urls = [];
    for (const item of form.attachments) {
        if (item.url) {
            urls.push(item.url);
            continue;
        }
        if (item.file) {
            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('type', 'temp');
            try {
                const uploadRes = await api.uploadFile(formData);
                const uploadData = uploadRes?.data || {};
                if (uploadData.url) {
                    urls.push(uploadData.url);
                    item.url = uploadData.url;
                    item.name = uploadData.name || item.name || getDisplayFileName(uploadData.url);
                } else {
                    ElMessage.error('附件上传失败');
                    return null;
                }
            } catch (error) {
                ElMessage.error('附件上传失败，请重试');
                return null;
            }
        }
    }
    return urls;
};

const handleUpload = (uploadFile) => {
    const file = uploadFile?.raw || uploadFile;
    if (!file) {
        ElMessage.error('文件选择失败');
        return;
    }
    form.attachments.push({ name: file.name, file });
    ElMessage.success(`附件已选择：${file.name}`);
};

const handleRemoveFile = (index) => {
    form.attachments.splice(index, 1);
};

// 打开负责人选择弹窗
const openManagerSelect = () => {
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
        ElMessage.error('获取负责人列表失败: ' + error.message);
        managerLoading.value = false;
    });
};

const debouncedSearch = debounce(() => {
    getManagerList();
}, 500);

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
    form.manager = row.name; // 回填姓名
    form.manager_id = row.id; // 保存负责人ID
    managerDialogVisible.value = false; // 关闭弹窗
    ElMessage.success(`已选择负责人：${row.name}`);
};
</script>

<template>
    <div class="declare-container">
        <div class="content-box">
            <div class="form-wrapper">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="200px">
                    <el-row :gutter="20">
                        <el-col :span="10">
                            <el-form-item label="赛事名称" prop="comp_name">
                                <el-input v-model="form.comp_name" placeholder="请输入赛事名称" :disabled="isReadOnly" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="10">
                            <el-form-item label="赛事等级" prop="comp_level">
                                <el-select v-model="form.comp_level" placeholder="请选择级别" :disabled="isReadOnly">
                                    <el-option v-for="item in levelOptions" :key="item.value" :label="item.label"
                                        :value="item.value" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="10">
                            <el-form-item label="赛事类型" prop="comp_type">
                                <el-select v-model="form.comp_type" placeholder="请选择类型" :disabled="isReadOnly">
                                    <el-option v-for="item in typeOptions" :key="item.value" :label="item.label"
                                        :value="item.value" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="10">
                            <el-form-item label="所属学院" prop="college">
                                <el-select v-model="form.college" placeholder="请选择所属学院" clearable style="width: 100%" :disabled="isReadOnly">
                                    <el-option v-for="college in collegeList" :key="college.id" :label="college.name"
                                        :value="college.id" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="10">
                            <el-form-item label="主办单位" prop="organizer">
                                <el-input v-model="form.organizer" placeholder="请填写主办单位" :disabled="isReadOnly" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="10">
                            <el-form-item label="承办单位" prop="undertaker">
                                <el-input v-model="form.undertaker" placeholder="请填写承办单位" :disabled="isReadOnly" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="10">
                            <el-form-item label="赛事负责人" prop="manager">
                                <el-input v-model="form.manager" placeholder="请选择赛事负责人" readonly
                                    class="manager-input" :disabled="isReadOnly" @click="!isReadOnly && openManagerSelect()" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="10">
                            <el-form-item label="所属年份" prop="comp_date">
                                <el-date-picker v-model="form.comp_date" type="year" placeholder="选择年份"
                                    style="width: 100%;" :disabled="isReadOnly" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="20">
                            <el-form-item label="赛事简介" prop="description">
                                <el-input v-model="form.description" type="textarea" :rows="3" :disabled="isReadOnly"
                                    placeholder="请简要描述赛事背景、参赛对象及主要内容..." />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="20">
                            <el-form-item label="附件材料" prop="attachment">
                                <div class="upload-wrapper">
                                    <el-upload v-if="!isReadOnly" class="upload-area" drag action="#" multiple :auto-upload="false"
                                        @change="handleUpload" :show-file-list="false" :disabled="isReadOnly">
                                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                                        <div class="el-upload__text">
                                            将文件拖到此处，或 <em>点击上传</em>
                                        </div>
                                        <template #tip>
                                            <div class="el-upload__tip">
                                                支持 PDF, Word, Excel 格式，大小不超过 10MB
                                            </div>
                                        </template>
                                    </el-upload>
                                    <div v-if="form.attachments.length" class="file-info">
                                        <div v-for="(fileItem, index) in form.attachments" :key="index" class="file-item">
                                            <span>已选择: {{ fileItem.name || getDisplayFileName(fileItem.url) }}</span>
                                            <div class="file-actions">
                                                <el-link v-if="fileItem.url" :href="fileItem.url" target="_blank" download>
                                                    下载
                                                </el-link>
                                                <el-button v-if="!isReadOnly" link type="danger" @click="handleRemoveFile(index)">移除</el-button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20" v-if="!isReadOnly">
                        <el-col :span="24">
                            <div class="button-container">
                                <el-button type="primary" @click="handleSave(formRef)" :loading="loading" :icon="Check">
                                    保存
                                </el-button>
                                <el-button @click="handleCancel" :icon="Close">取消</el-button>
                            </div>
                        </el-col>
                    </el-row>
                </el-form>
            </div>
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
.declare-container {
    width: 100%;
    min-height: 85vh;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
}

.content-box {
    width: 100%;
    background-color: #ffffff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    padding: 20px;
    box-sizing: border-box;
}

 .form-wrapper {
    margin-top: 15px;
 }

.upload-wrapper {
    width: 100%;

    .upload-area {
        :deep(.el-upload-dragger) {
            padding: 10px;
            height: auto;
        }
    }

    .file-info {
        margin-top: 10px;
        padding: 10px;
        background-color: #f5f7fa;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            span {
                font-size: 14px;
                color: #666;
                word-break: break-all;
                margin-right: 10px;
            }

            .file-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
        }
    }
}

.button-container {
    display: flex;
    justify-content: center;
    gap: 10px;
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
</style>