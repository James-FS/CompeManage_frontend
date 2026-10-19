<script setup>
import { ref } from 'vue'
import api from '@/api'
import { ElMessage } from 'element-plus'
const props = defineProps({ awardId: { type: Number, required: true } })
const visible = ref(false), loading = ref(false), changes = ref([])
const fields = { project_name: '项目名称', award_category: '获奖类别', award_name: '获奖等级', award_time: '获奖日期', proof_url: '获奖证明', remark: '备注', status: '状态' }
const statuses = { draft: '待审核', rejected: '已退回', approved: '已通过' }
function rows(change) {
  try {
    const before = JSON.parse(change.before), after = JSON.parse(change.after)
    const display = (key, value) => key === 'status' ? (statuses[value] || value) : (value || '空')
    return Object.keys(fields).filter(key => before[key] !== after[key]).map(key => ({ field: fields[key], before: display(key, before[key]), after: display(key, after[key]) }))
  } catch { return [] }
}
async function open() {
  visible.value = true; loading.value = true; changes.value = []
  try { changes.value = (await api.getAwardChanges(props.awardId)).data.list || [] }
  catch (error) { if (!error.messageShown) ElMessage.error('获取修改记录失败') }
  finally { loading.value = false }
}
</script>
<template>
  <el-button link type="primary" @click="open">修改记录</el-button>
  <el-dialog v-model="visible" title="教师修改记录" width="min(760px, 94vw)" append-to-body>
    <div v-loading="loading" style="min-height: 100px">
      <el-empty v-if="!loading && !changes.length" description="暂无教师修改记录" />
      <el-timeline v-else><el-timeline-item v-for="change in changes" :key="change.id" :timestamp="change.create_time"><p>{{ change.operator_name }}</p><el-table :data="rows(change)" size="small"><el-table-column prop="field" label="字段" width="100" /><el-table-column prop="before" label="修改前" /><el-table-column prop="after" label="修改后" /></el-table></el-timeline-item></el-timeline>
    </div>
  </el-dialog>
</template>
