<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Paperclip, Refresh, UploadFilled } from '@element-plus/icons-vue'
import api from '@/api'
import { fileUploadPolicies } from '@/config/fileUploadPolicies'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  businessType: { type: String, default: '' },
  accept: { type: String, default: undefined },
  maxSizeMb: { type: Number, default: undefined },
  maxFiles: { type: Number, default: undefined },
  multiple: { type: Boolean, default: undefined },
  autoUpload: { type: Boolean, default: false },
  selectionOnly: { type: Boolean, default: false },
  variant: { type: String, default: 'dropzone' },
  disabled: { type: Boolean, default: false },
  showFileList: { type: Boolean, default: true },
  buttonText: { type: String, default: '' },
  helperText: { type: String, default: undefined },
})

const emit = defineEmits(['update:modelValue', 'success', 'upload-error', 'preview', 'select'])
const inputRef = ref(null)
const componentUnmounted = ref(false)
// 组件先更新本地文件列表，再通知父组件同步 v-model。
const files = ref([...(props.modelValue || [])])
// 父组件主动改变 modelValue（如 initData 回填）时同步内部数组
// 用 nextTick 延迟同步，避免 emitFiles 后被覆盖回旧数组
watch(() => props.modelValue, async (next) => {
  await nextTick()
  if (next && next !== files.value) files.value = [...next]
})
const knownUrls = new Set()
watch(files, (items) => {
  for (const item of items) {
    if (item.url) knownUrls.add(item.url)
  }
}, { immediate: true, deep: true })
const isUploading = computed(() => files.value.some((item) => item.status === 'uploading'))
const policy = computed(() => fileUploadPolicies[props.businessType] || {})
const acceptValue = computed(() => props.accept ?? policy.value.accept ?? '')
const maxSizeMb = computed(() => props.maxSizeMb ?? policy.value.maxSizeMb ?? 30)
const maxFiles = computed(() => props.maxFiles ?? policy.value.maxFiles ?? 5)
const multiple = computed(() => props.multiple ?? policy.value.multiple ?? true)
const helperText = computed(() => props.helperText ?? policy.value.helperText ?? '')
const allowedExtensions = computed(() => acceptValue.value
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.startsWith('.')))

const emitFiles = (next) => { files.value = next; emit('update:modelValue', next) }

function openPicker() {
  if (!props.disabled) inputRef.value?.click()
}

function validateFile(file) {
  if (file.size > maxSizeMb.value * 1024 * 1024) {
    return `「${file.name}」超过 ${maxSizeMb.value} MB，请选择较小的文件`
  }

  if (allowedExtensions.value.length) {
    const lowerName = file.name.toLowerCase()
    const allowed = allowedExtensions.value.some((extension) => lowerName.endsWith(extension))
    if (!allowed) return `「${file.name}」格式不支持`
  }

  return ''
}

async function addFiles(fileList) {
  if (props.disabled) return

  const incoming = Array.from(fileList || [])
  if (!incoming.length) return

  let next = props.selectionOnly || !multiple.value ? [] : [...files.value]
  const accepted = []
  const rejected = []

  for (const file of incoming) {
    const validationError = validateFile(file)
    if (validationError) {
      rejected.push(validationError)
      continue
    }

    const currentCount = multiple.value ? next.length : accepted.length
    if (currentCount >= maxFiles.value) {
      rejected.push(`最多只能添加 ${maxFiles.value} 个文件`)
      continue
    }

    const item = {
      uid: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      raw: file,
      status: 'ready',
      progress: 0,
    }
    next.push(item)
    accepted.push(item)
  }

  if (!accepted.length && !multiple.value && !props.selectionOnly) next = [...files.value]
  if (!props.selectionOnly) emitFiles(next)
  rejected.forEach((message) => ElMessage.warning(message))

  if (props.selectionOnly) {
    const rawFiles = accepted.map((item) => item.raw)
    if (rawFiles.length) emit('select', multiple.value ? rawFiles : rawFiles[0])
    return
  }

  if (props.autoUpload) {
    // Wait for the parent to pass the updated v-model back to this component.
    await nextTick()
    for (const item of accepted) {
      if (componentUnmounted.value) break
      // 直接传 item 引用，绕开 computed 缓存竞态（修复上传静默失败）
      await uploadItem(item).catch(() => {})
    }
  }
}

function handleInputChange(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function handleDrop(event) {
  event.preventDefault()
  if (!props.disabled) addFiles(event.dataTransfer?.files)
}

// 2026-11-19 修复：updateItem 改为"快照式"更新——直接用传入的 item 对象作为该条目最新状态，
// 绕开 files.value（computed ← props.modelValue）缓存刷新竞态。
// 旧实现 files.value.map(...) 在 addFiles→uploadItem 连续调用期间读到旧数组，
// 导致上传成功后 emit 出的新数组丢失该条目（url 不回填 → 提交时误判"请重新上传失败的作品文件"）。
function updateItem(item, patch) {
  const updated = { ...item, ...patch }
  const next = files.value.map((candidate) => candidate.uid === item.uid ? updated : candidate)
  emitFiles(next)
}

// 2026-11-19 修复：uploadItem 改为接收 item 对象直接操作。
// 旧实现从 files.value（computed ← props.modelValue）按 uid 查找，而 addFiles 的
// emitFiles(next) 到 uploadItem 之间存在 Vue computed 缓存刷新竞态——files.value
// 仍是旧数组导致 find 不到新文件、上传静默跳过、文件停留在 status:'ready'，
// 提交时被 workDetail 判为"请重新上传失败的作品文件"。
async function uploadItem(item) {
  if (!props.businessType) throw new Error('缺少文件业务类型')
  const rawFile = item?.raw || item?.file
  if (!item || !rawFile || item.url) return item
  if (item.status === 'uploading') return item

  updateItem(item, { status: 'uploading', progress: 0, error: '' })

  try {
    const response = await api.uploadFile(rawFile, props.businessType, {
      timeout: 120000,
      onUploadProgress: (event) => {
        if (!event.total) return
        updateItem(item, { progress: Math.round((event.loaded * 100) / event.total) })
      },
    })
    if (response?.code !== 200 && response?.code !== 0) {
      throw new Error(response?.message || response?.msg || '上传失败')
    }

    const data = response?.data || {}
    if (!data.url) throw new Error('上传完成，但服务器没有返回文件地址')
    knownUrls.add(data.url)

    const uploaded = {
      ...item,
      name: data.name || item.name,
      url: data.url,
      size: data.size ?? item.size,
      mime_type: data.mime_type || '',
      raw: undefined,
      file: undefined,
      status: 'success',
      progress: 100,
      error: '',
    }
    if (componentUnmounted.value) {
      api.cleanupUploadedFile(data.url).catch(() => {})
      return uploaded
    }
    updateItem(item, uploaded)
    emit('success', uploaded, response)
    return uploaded
  } catch (error) {
    const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || '上传失败'
    updateItem(item, { status: 'error', error: message })
    emit('upload-error', error, item)
    if (!error?.messageShown) {
      ElMessage.error(`${item.name}：${message}`)
      error.messageShown = true
    }
    throw error
  }
}

async function uploadPending() {
  const pending = files.value.filter((item) => !item.url && (item.raw || item.file))
  const errors = []
  for (const item of pending) {
    try {
      await uploadItem(item)
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length) throw errors[0]
  await nextTick()
  return files.value
}

function removeFile(uid) {
  emitFiles(files.value.filter((item) => item.uid !== uid))
}

function retryFile(uid) {
  const item = files.value.find((candidate) => candidate.uid === uid)
  if (item) uploadItem(item).catch(() => {})
}

function previewFile(item) {
  if (item.url) emit('preview', item)
}

onBeforeUnmount(() => {
  componentUnmounted.value = true
  for (const url of knownUrls) {
    api.cleanupUploadedFile(url).catch(() => {})
  }
})

defineExpose({ uploadPending, openPicker, isUploading })
</script>

<template>
  <div
    class="file-upload-field"
    :class="[`is-${variant}`, { 'is-disabled': disabled }]"
    @dragover.prevent
    @drop="handleDrop"
  >
    <input
      ref="inputRef"
      class="file-upload-field__input"
      type="file"
      :accept="acceptValue"
      :multiple="multiple"
      :disabled="disabled"
      tabindex="-1"
      @change="handleInputChange"
    />

    <div v-if="variant === 'dropzone'" class="file-upload-field__dropzone">
      <button
        class="file-upload-field__trigger"
        type="button"
        :disabled="disabled"
        :aria-label="buttonText || '点击或拖拽文件上传'"
        @click="openPicker"
      >
        <slot name="trigger" :files="files" :open="openPicker">
          <el-icon aria-hidden="true"><Paperclip /></el-icon>
          <span>{{ buttonText || '点击或拖拽文件上传' }}</span>
        </slot>
      </button>
      <p v-if="helperText" class="file-upload-field__hint">{{ helperText }}</p>
    </div>

    <div v-else class="file-upload-field__button-wrap">
      <button
        class="file-upload-field__button"
        type="button"
        :disabled="disabled"
        :aria-label="buttonText || '选择文件'"
        @click="openPicker"
      >
        <slot name="trigger" :files="files" :open="openPicker">
          <el-icon aria-hidden="true"><UploadFilled /></el-icon>
          <span>{{ buttonText || '选择文件' }}</span>
        </slot>
      </button>
      <p v-if="helperText" class="file-upload-field__hint">{{ helperText }}</p>
    </div>

    <ul v-if="showFileList && files.length" class="file-upload-field__list">
      <li v-for="item in files" :key="item.uid || item.url || item.name" class="file-upload-field__item">
        <button
          class="file-upload-field__name"
          type="button"
          :disabled="!item.url"
          @click="previewFile(item)"
        >
          {{ item.name }}
        </button>
        <span class="file-upload-field__status" :class="`is-${item.status || 'success'}`">
          {{ item.status === 'uploading' ? `上传中 ${item.progress || 0}%` : item.status === 'error' ? '上传失败' : item.url ? '已上传' : '待上传' }}
        </span>
        <button
          v-if="item.status === 'error' && (item.raw || item.file)"
          class="file-upload-field__icon-button"
          type="button"
          aria-label="重试上传"
          :disabled="disabled || item.status === 'uploading'"
          @click="retryFile(item.uid)"
        >
          <el-icon><Refresh /></el-icon>
        </button>
        <button
          class="file-upload-field__icon-button"
          type="button"
          aria-label="移除文件"
          :disabled="disabled || item.status === 'uploading'"
          @click="removeFile(item.uid)"
        >
          <el-icon><Delete /></el-icon>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.file-upload-field {
  width: 100%;
  color: #303133;
}

.file-upload-field__input {
  display: none;
}

.file-upload-field__dropzone {
  min-height: 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px 18px;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  background: #fff;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.file-upload-field__dropzone:hover,
.file-upload-field__dropzone:focus-within {
  border-color: #2b4c7e;
  background: #f8fafc;
}

.file-upload-field__trigger,
.file-upload-field__button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: #425b7a;
  font: inherit;
  cursor: pointer;
}

.file-upload-field__button-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.is-button .file-upload-field__hint {
  text-align: left;
}

.is-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.file-upload-field__trigger:focus-visible,
.file-upload-field__button:focus-visible,
.file-upload-field__icon-button:focus-visible,
.file-upload-field__name:focus-visible {
  outline: 2px solid #2b4c7e;
  outline-offset: 2px;
}

.file-upload-field__trigger:hover,
.file-upload-field__button:hover {
  color: #2b4c7e;
}

.file-upload-field__hint {
  margin: 0;
  color: #596579;
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}

.file-upload-field__button {
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
}

.file-upload-field__button:hover {
  border-color: #2b4c7e;
  background: #f8fafc;
}

.file-upload-field__list {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.file-upload-field__item {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid #e4e9f0;
  border-radius: 5px;
  background: #fff;
}

.file-upload-field__name {
  min-width: 0;
  overflow: hidden;
  flex: 1;
  border: 0;
  background: transparent;
  color: #35465e;
  font: inherit;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-upload-field__name:not(:disabled) {
  cursor: pointer;
}

.file-upload-field__status {
  flex: none;
  color: #667085;
  font-size: 12px;
}

.file-upload-field__status.is-success {
  color: #34785b;
}

.file-upload-field__status.is-error {
  color: #b54747;
}

.file-upload-field__icon-button {
  width: 28px;
  height: 28px;
  flex: none;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #68778d;
  cursor: pointer;
}

.file-upload-field__icon-button:hover:not(:disabled) {
  background: #eef2f7;
  color: #2b4c7e;
}

.file-upload-field__icon-button:disabled,
.file-upload-field__trigger:disabled,
.file-upload-field__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.is-disabled .file-upload-field__dropzone {
  background: #f8fafc;
}

@media (max-width: 600px) {
  .file-upload-field__item {
    flex-wrap: wrap;
  }

  .file-upload-field__name {
    flex-basis: calc(100% - 70px);
  }

  .file-upload-field__hint {
    max-width: 100%;
  }
}
</style>
