import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import api from '@/api'
import FileUploadField from './FileUploadField.vue'

vi.mock('@/api', () => ({
  default: {
    uploadFile: vi.fn(),
    cleanupUploadedFile: vi.fn().mockResolvedValue({}),
  },
}))

test('upload progress preserves the uploading status until the server responds', async () => {
  let onProgress
  let finishUpload
  api.uploadFile.mockImplementation((file, businessType, options) => {
    onProgress = options.onUploadProgress
    return new Promise(resolve => { finishUpload = resolve })
  })

  const wrapper = mount(FileUploadField, {
    props: {
      autoUpload: true,
      businessType: 'work',
      'onUpdate:modelValue': files => wrapper.setProps({ modelValue: files }),
    },
    global: { stubs: { ElButton: true, ElIcon: true, ElProgress: true } },
  })
  const input = wrapper.get('input[type=file]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['work'], 'work.zip')],
  })

  await input.trigger('change')
  await flushPromises()
  expect(wrapper.vm.isUploading).toBe(true)
  onProgress({ loaded: 5, total: 10 })
  await flushPromises()
  const currentFile = () => wrapper.emitted('update:modelValue').at(-1)[0][0]
  expect(currentFile()).toMatchObject({ status: 'uploading', progress: 50 })
  expect(wrapper.vm.isUploading).toBe(true)

  finishUpload({ code: 200, data: { url: '/mock/work.zip' } })
  await flushPromises()
  expect(currentFile()).toMatchObject({ status: 'success', progress: 100, url: '/mock/work.zip' })
  expect(wrapper.vm.isUploading).toBe(false)
  wrapper.unmount()
})
