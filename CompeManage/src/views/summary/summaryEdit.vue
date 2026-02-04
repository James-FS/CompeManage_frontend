<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Plus, 
  Delete, 
  UploadFilled, 
  User, 
  Trophy,
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const formRef = ref(null);

const compId = route.params.id;
const compName = route.query.name; 

const form = reactive({
  comp_name: compName,
  organizer: '',
  undertaker: '',
  college_info: { name: '' },
  manager: '',
  time_range: '',
  
  // 核心统计数据 (系统自动同步)
  participant_count: 0, 
  award_stats: [], 
  
  // 经费明细 (可编辑)
  expenses: [
    { usage: '', amount: 0, remark: '' }
  ],
  
  // 总结与附件 (可编辑)
  summary_content: '',
  attachments: []
});

const rules = {
  summary_content: [{ required: true, message: '请填写赛事总结内容', trigger: 'blur' }]
};

// --- 计算属性 ---

const totalExpense = computed(() => {
  return form.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2);
});

const totalAwards = computed(() => {
    return form.award_stats.reduce((sum, item) => sum + Number(item.count || 0), 0);
});

// 初始化加载数据
const loadData = async () => {
  loading.value = true;
  try {
    setTimeout(() => {
      form.organizer = '计算机学院';
      form.undertaker = '计算机学院团委';
      form.college_info.name = '计算机学院';
      form.manager = '张三';
      form.time_range = '2025-01-01 至 2025-06-20';

      form.participant_count = 156;
      form.award_stats = [
        { level: '一等奖', count: 3 },
        { level: '二等奖', count: 5 },
        { level: '三等奖', count: 12 },
        { level: '优秀奖', count: 20 }
      ];

      loading.value = false;
    }, 500);

  } catch (error) {
    console.error(error);
    loading.value = false;
  }
};

// --- 经费操作 ---
const addExpenseRow = () => {
  form.expenses.push({ usage: '', amount: 0, remark: '' });
};

const removeExpenseRow = (index) => {
  form.expenses.splice(index, 1);
};

// --- 提交处理 ---
const handleSubmit = async (isArchive = false) => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const invalidExpense = form.expenses.some(item => !item.usage && item.amount > 0);
      if (invalidExpense) {
        ElMessage.warning('请完善经费使用明细');
        return;
      }

      const actionText = isArchive ? '提交归档' : '保存草稿';
      
      try {
        await ElMessageBox.confirm(
          `确定要${actionText}吗？${isArchive ? '归档后将不可修改。' : ''}`, 
          '提示', 
          { confirmButtonText: '确定', cancelButtonText: '取消', type: isArchive ? 'warning' : 'info' }
        );

        loading.value = true;
        setTimeout(() => {
            console.log('提交的数据:', { ...form, status: isArchive ? 1 : 0 });
            ElMessage.success(`${actionText}成功`);
            if (isArchive) {
                router.push({ name: 'SummaryList' });
            }
            loading.value = false;
        }, 500);
      } catch (e) { }
    }
  });
};

const goBack = () => {
  router.push({ name: 'SummaryList' });
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="summary-add-container">

    <div class="content-wrapper" v-loading="loading">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="top">
        
        <el-card shadow="never" class="section-card">
           <template #header>
            <div class="card-header"><span>基础信息</span></div>
           </template>
           <el-descriptions :column="4" border>
            <el-descriptions-item label="赛事名称">{{ form.comp_name }}</el-descriptions-item>
            <el-descriptions-item label="主办单位">{{ form.organizer }}</el-descriptions-item>
            <el-descriptions-item label="承办单位">{{ form.undertaker }}</el-descriptions-item>
            <el-descriptions-item label="所属学院">{{ form.college_info?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="赛事负责人">{{ form.manager }}</el-descriptions-item>
            <el-descriptions-item label="举办时间" :span="2">{{ form.time_range }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <div class="section-title">赛事数据统计</div>
        
        <el-row :gutter="15" class="stats-overview-row">
            <!-- 左侧：参赛人数和获奖总数上下显示 -->
            <el-col :span="6">
                <div class="stats-left-column">
                    <el-card shadow="hover" class="stat-card compact-card">
                        <div class="stat-item">
                            <div class="stat-icon bg-blue small-icon">
                                <el-icon><User /></el-icon>
                            </div>
                            <div class="stat-info">
                                <div class="label">参赛人数</div>
                                <div class="value">{{ form.participant_count }} <span class="unit">人</span></div>
                            </div>
                        </div>
                    </el-card>

                    <el-card shadow="hover" class="stat-card compact-card">
                        <div class="stat-item">
                            <div class="stat-icon bg-orange small-icon">
                                <el-icon><Trophy /></el-icon>
                            </div>
                            <div class="stat-info">
                                <div class="label">获奖总数</div>
                                <div class="value">{{ totalAwards }} <span class="unit">项</span></div>
                            </div>
                        </div>
                    </el-card>
                </div>
            </el-col>

            <!-- 右侧：获奖详情表格 -->
            <el-col :span="18">
                <el-card shadow="never" class="distribution-card compact-card" :body-style="{ padding: '0px' }">
                    <el-table :data="form.award_stats" stripe style="width: 100%" size="small" :show-header="true">
                        <el-table-column prop="level" label="奖项等级" align="center">
                            <template #default="{ row }">
                                <span class="text-xs">{{ row.level }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="count" label="人数" align="center">
                             <template #default="{ row }">
                                <el-tag size="small" effect="plain">{{ row.count }}</el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </el-col>
        </el-row>
        
        <el-card shadow="never" class="section-card mt-15">
             <template #header>
                <div class="card-header">
                    <span>经费使用情况编辑</span>
                </div>
            </template>
             <el-table :data="form.expenses" border style="width: 100%">
                <el-table-column label="经费用途" min-width="200">
                    <template #default="{ row }">
                        <el-input v-model="row.usage" placeholder="例如：打印费、奖品采购" size="small"/>
                    </template>
                </el-table-column>
                <el-table-column label="金额 (元)" width="180">
                    <template #default="{ row }">
                        <el-input-number v-model="row.amount" :min="0" :precision="2" style="width: 100%" size="small" />
                    </template>
                </el-table-column>
                <el-table-column label="备注" min-width="200">
                    <template #default="{ row }">
                        <el-input v-model="row.remark" placeholder="备注说明" size="small"/>
                    </template>
                </el-table-column>
                 <el-table-column label="操作" width="60" align="center">
                    <template #default="{ $index }">
                        <el-button type="danger" :icon="Delete" circle size="small" @click="removeExpenseRow($index)" />
                    </template>
                </el-table-column>
             </el-table>
             <div class="table-footer">
                <el-button type="primary" plain :icon="Plus"  style="width: 100%" @click="addExpenseRow">添加经费明细</el-button>
            </div>
        </el-card>

        <el-card shadow="never" class="section-card">
            <template #header><span>总结报告与附件</span></template>
            <el-form-item label="赛事活动总结" prop="summary_content">
                 <el-input 
                    v-model="form.summary_content" 
                    type="textarea" 
                    :rows="5" 
                    placeholder="请填写本次赛事的组织情况、成效、存在问题及改进建议..."
                    maxlength="2000" 
                    show-word-limit 
                 />
            </el-form-item>
            <el-form-item label="附件上传">
                <div class="file-upload-container">
                    <el-upload class="upload-demo" drag action="#" multiple :auto-upload="false" v-model:file-list="form.attachments">
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
                        <template #tip>
                            <div class="el-upload__tip">
                                支持 PDF, Word, Excel, ZIP 格式，大小不超过 10MB
                            </div>
                        </template>
                    </el-upload>
                    <div v-if="form.attachments.length > 0" class="file-list-info">
                        <div class="file-list-title">已选择附件：</div>
                        <div v-for="(file, index) in form.attachments" :key="index" class="file-item-info">
                            <span class="file-name">{{ file.name || file }}</span>
                            <el-button link type="danger" size="small" @click="form.attachments.splice(index, 1)">移除</el-button>
                        </div>
                    </div>
                </div>
            </el-form-item>
        </el-card>

        <div class="footer-actions">
          <el-button @click="handleSubmit(false)">保存草稿</el-button>
          <el-button type="primary" @click="handleSubmit(true)">提交归档</el-button>
        </div>

      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.summary-add-container {
  padding: 20px;
  background-color: var(--background-color);
  min-height: 100%;
}



.section-title {
    font-size: 14px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 10px;
    border-left: 3px solid #409EFF;
    padding-left: 8px;
}

.section-card {
  margin-bottom: 15px;
  :deep(.el-card__header) {
    padding: 10px 15px;
    font-weight: bold;
    font-size: 14px;
    background-color: #fafafa;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-footer { margin-top: 8px; }
.footer-actions { display: flex; justify-content: center; gap: 20px; margin-top: 20px; padding-bottom: 40px; }
.mt-15 { margin-top: 15px; }
.text-xs { font-size: 12px; }

/* 文件上传容器样式 */
.file-upload-container {
    width: 100%;
    
    .upload-demo {
        width: 100%;
    }

    .file-list-info {
        margin-top: 15px;
        padding: 10px 15px;
        background-color: #f9f9f9;
        border: 1px solid #ebeef5;
        border-radius: 4px;

        .file-list-title {
            font-size: 14px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 10px;
        }

        .file-item-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;

            &:last-child {
                border-bottom: none;
            }

            .file-name {
                font-size: 13px;
                color: #606266;
                flex: 1;
                word-break: break-all;
            }
        }
    }
}

/* 紧凑型统计区域样式 */
.stats-overview-row {
    margin-bottom: 15px;
    display: flex;
    align-items: stretch; /* 让高度一致 */

    .stats-left-column {
        display: flex;
        flex-direction: column;
        gap: 15px;

        .stat-card {
            flex: 1;
        }
    }

    .compact-card {
        border: none;
        box-shadow: var(--card-shadow);
        display: flex;
        flex-direction: column;
        justify-content: center;

        :deep(.el-card__body) {
            padding: 12px 15px;
        }

        .stat-item {
            display: flex;
            align-items: center;
            padding: 5px 0; /* 移除内边距 */
            
            .small-icon {
                width: 40px;
                height: 40px;
                font-size: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                flex-shrink: 0;
                color: #fff;
                
                &.bg-blue { background-color: #409EFF; }
                &.bg-orange { background-color: #E6A23C; }
                &.bg-green { background-color: #67C23A; }
            }

            .stat-info {
                flex: 1;
                .label { font-size: 12px; color: #909399; margin-bottom: 2px; }
                .value { font-size: 20px; font-weight: bold; color: #303133; }
                .unit { font-size: 12px; color: #909399; font-weight: normal; margin-left: 2px; }
            }
        }
    }
    
    .distribution-card {
        /* 表格容器样式微调 */
        border: 1px solid #EBEEF5;
        overflow: hidden;
    }
}
</style>