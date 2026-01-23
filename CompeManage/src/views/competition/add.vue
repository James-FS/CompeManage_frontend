<script setup>
import { ref, reactive, computed, renderList } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElTableColumn } from 'element-plus';
import { Plus, DocumentCopy, ArrowRight, Check, Delete, ArrowLeft } from '@element-plus/icons-vue';

const router = useRouter();
const activeTab = ref('manual');

// Tab 1 手动录入新赛事
const formRef = ref(null);
const form = reactive({
    comp_name: '', comp_level: '', comp_type: '', organizer: '',
    undertaker: '', manager: '', college: '', desc: ''
});
const rules = {
    comp_name: [{ required: true, message: '请输入赛事名称', trigger: 'blur' }],
    comp_level: [{ required: true, message: '请选择赛事级别', trigger: 'change' }],
    college: [{ required: true, message: '请选择所属学院', trigger: 'change' }],
};
const handleSubmit = async (formEl) => {
    if (!formEl) return;
    await formEl.validate((valid) => {
        if (valid) {
            ElMessage.success('赛事新增成功！');
            router.push({ name: 'CompetitionList' });
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
const historyLoading = ref(false);
const historyTableData = ref([]);
const selectedHistoryRows = ref([]);

// 待导入数据(可编辑)
const importList = ref([]);

// 模拟查询历史数据
const fetchHistoryData = () => {
    if (!copySourceYear.value) return;
    historyLoading.value = true;
    setTimeout(() => {
        // 模拟数据
        historyTableData.value = [
            { id: 101, comp_name: `${copySourceYear.value}年ACM程序设计竞赛`, comp_level: '校级', organizer: '广州大学', undertaker: '计算机学院', manager: '李教授', college: '计算机学院' },
            { id: 102, comp_name: `${copySourceYear.value}年大学生创新创业训练`, comp_level: '校级', organizer: '广州大学', undertaker: '创新创业学院', manager: '王老师', college: '创新创业学院' },
            { id: 103, comp_name: `${copySourceYear.value}年蓝桥杯模拟赛`, comp_level: '校级', organizer: '广州大学', undertaker: '软件工程系', manager: '张讲师', college: '计算机学院' },
        ];
        historyLoading.value = false;
    }, 500);
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
    const targetYear = new Date().getFullYear().toString(); // 当前年份
    const sourceYear = copySourceYear.value; // 来源年份

    // 深拷贝并处理数据
    importList.value = selectedHistoryRows.value.map(item => {
        // 自动替换名称中的年份
        let newName = item.comp_name;
        if (sourceYear && newName.includes(sourceYear)) {
            newName = newName.replace(sourceYear, targetYear);
        }

        return {
            ...item,
            // 可以在这里清空某些不该复制的字段，比如“状态”
            status: '未开始',
            // 赋上处理过的新名称
            comp_name: newName,
            // 标记原始ID，方便后端溯源
            source_id: item.id
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

    ElMessageBox.confirm(
        `确认将这 ${importList.value.length} 项赛事导入到本年度赛事库吗？`,
        '最终确认',
        { confirmButtonText: '确认导入', cancelButtonText: '取消', type: 'success' }
    ).then(() => {
        // TODO: 调用后端批量新增接口，传递 importList.value
        console.log('提交的数据:', importList.value);

        ElMessage.success('批量导入成功！');
        router.push({ name: 'CompetitionList' });
    }).catch(() => { });
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
                                        <el-select v-model="form.college" placeholder="请选择学院" style="width: 100%">
                                            <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院" />
                                            <el-option label="电子信息工程学院" value="电子信息工程学院" />
                                            <el-option label="经济管理学院" value="经济管理学院" />
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
                                <el-col :span="8">
                                    <el-form-item label="负责人" prop="manager">
                                        <el-input v-model="form.manager" placeholder="请填写教师姓名" />
                                    </el-form-item>
                                </el-col>
                            </el-row>
                            <el-form-item label="备注说明" prop="desc">
                                <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="填写赛事的其他补充说明..." />
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="handleSubmit(formRef)">立即创建</el-button>
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
                                <el-select v-model="copySourceYear" placeholder="请选择年份" @change="fetchHistoryData">
                                    <el-option label="2024年" value="2024" />
                                    <el-option label="2023年" value="2023" />
                                </el-select>
                            </div>
                            <el-table :data="historyTableData" border v-loading="historyLoading"
                                @selection-change="handleSelectionChange" height="400">
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
                                <el-alert title="系统已自动替换年份，请在下方直接修改赛事变动信息" type="info" show-icon :closable="false" />
                            </div>
                            <el-table :data="importList" border height="400" class="edit-table">
                                <el-table-column label="序号" type="index" width="55" align="center" />
                                <el-table-column label="新赛事名称 (可编辑)" min-width="220" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.comp_name" placeholder="赛事名称" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="负责人" width="140" align="center">
                                    <template #default="{ row }">
                                        <el-input v-model="row.manager" placeholder="负责人" />
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
            </el-tabs>
        </div>

    </div>
</template>

<style scoped lang="scss">
.add-container {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--background-color);
}

.content-box {
    margin-bottom: 15px;
    overflow: hidden;
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
    margin-bottom: 30px;
}

.step-content {
    animation: fadeIn 0.3s ease;
}

.filter-bar {
    margin-bottom: 15px;

    .label {
        font-weight: bold;
        margin-right: 10px;
    }
}

.step-footer {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    border-top: 1px solid #eee;
    padding-top: 20px;

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
</style>