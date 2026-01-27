<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElCol, ElMessage } from 'element-plus';
import {
    Check, Refresh,
    Document, UploadFilled
} from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const formRef = ref(null); // 添加表单引用

// 表单数据
const form = reactive({
    comp_name: '',
    comp_level: '',
    comp_type: '',
    comp_date: '',
    location: '',
    organizer: '',
    description: '',
    attachment: ''
});

// 验证规则 
const rules = {
    comp_name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
    comp_level: [{ required: true, message: '请选择赛事等级', trigger: 'change' }],
    comp_type: [{ required: true, message: '请选择赛事类型', trigger: 'change' }],
    comp_date: [{ required: true, message: '请选择赛事时间', trigger: 'change' }]
};

// 选项数据保持不变
const levelOptions = [
    { label: '校级', value: 'school' },
    { label: '省级', value: 'province' },
    { label: '国家级', value: 'national' },
    { label: '国际级', value: 'international' }
];

const typeOptions = [
    { label: '学科竞赛', value: 'discipline' },
    { label: '创新创业竞赛', value: 'innovation' },
    { label: '体育竞赛', value: 'sports' },
    { label: '其他', value: 'other' }
];

const goBack = () => router.back();

const resetForm = (formEl) => {
    if (!formEl) return;
    formEl.resetFields(); // 使用 element 自带的重置
    form.attachment = ''; // 手动重置非 prop 绑定的特殊字段
};

const handleSave = async (formEl) => {
    if (!formEl) return;

    await formEl.validate((valid) => {
        if (valid) {
            loading.value = true;
            try {
                // 模拟 API 调用
                setTimeout(() => {
                    ElMessage.success({
                        message: '🎉 申报信息保存成功！',
                        plain: true,
                    });
                    router.push('/competition/audit');
                    loading.value = false;
                }, 1000);
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

const handleUpload = (file) => {
    form.attachment = file.name;
    ElMessage.success(`文件 ${file.name} 准备就绪`);
};

const handleRemoveFile = () => {
    form.attachment = '';
}
</script>

<template>
    <div class="add-container">
        <div class="content-box">
            <div class="form-wrapper">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-form-item label="赛事名称" prop="comp_name">
                                <el-input v-model="form.comp_name" placeholder="请输入赛事名称" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="赛事等级" prop="comp_level">
                                <el-select v-model="form.comp_level" placeholder="请选择级别" style="width: 100%">
                                    <el-option v-for="item in levelOptions" :key="item.value" :label="item.label"
                                        :value="item.value" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-form-item label="赛事类型" prop="comp_type">
                                <el-select v-model="form.comp_type" placeholder="请选择类型" style="width: 100%">
                                    <el-option v-for="item in typeOptions" :key="item.value" :label="item.label"
                                        :value="item.value" />
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="赛事时间" prop="comp_date">
                                <el-input v-model="form.comp_date" placeholder="请选择赛事时间" />
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
                            <el-form-item label="举办地点" prop="location">
                                <el-input v-model="form.location" placeholder="请填写举办地点" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-form-item label="赛事简介" prop="description">
                        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请简要描述赛事背景、参赛对象及主要内容..." />
                    </el-form-item>
                    <el-form-item label="附件材料" prop="attachment">
                        <div class="upload-wrapper">
                            <el-upload class="upload-area" drag action="#" :auto-upload="false" :show-file-list="false"
                                @change="handleUpload">
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

                            <transition name="el-zoom-in-top">
                                <div v-if="form.attachment" class="file-preview">
                                    <div class="file-icon">
                                        <el-icon>
                                            <Document />
                                        </el-icon>
                                    </div>
                                    <div class="file-info">
                                        <span class="name">{{ form.attachment }}</span>
                                        <span class="status">准备上传</span>
                                    </div>
                                    <el-button type="danger" link @click="handleRemoveFile">删除</el-button>
                                </div>
                            </transition>
                        </div>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="handleSave(formRef)" :loading="loading" :icon="Check">
                            提交申报
                        </el-button>
                        <el-button @click="resetForm(formRef)" :icon="Refresh">重置</el-button>
                    </el-form-item>
                </el-form>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.add-container {
    width: 100%;
    height: 100%;
    background-color: var(--background-color);
    padding: 20px;
     box-sizing: border-box;
}

.content-box {
    overflow: hidden;
}

.form-wrapper {
    box-sizing: border-box;
    padding: 20px;
    background-color: #ffffff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    border-radius: 4px;

    :deep(.el-form) {
        :deep(.el-form-item__label) {
            font-weight: 500;
        }
    }
}

.upload-wrapper {
    width: 100%;

    .upload-area {
        :deep(.el-upload-dragger) {
            padding: 20px;
            height: auto;
        }
    }

    .file-preview {
        margin-top: 12px;
        background: #f5f7fa;
        border-radius: 4px;
        padding: 10px 15px;
        display: flex;
        align-items: center;
        border: 1px solid #e4e7ed;

        .file-icon {
            font-size: 20px;
            color: var(--el-color-primary);
            margin-right: 12px;
            display: flex;
            align-items: center;
        }

        .file-info {
            flex: 1;
            display: flex;
            flex-direction: column;

            .name {
                font-size: 14px;
                color: #303133;
                font-weight: 500;
            }

            .status {
                font-size: 12px;
                color: #67c23a;
            }
        }
    }
}
</style>