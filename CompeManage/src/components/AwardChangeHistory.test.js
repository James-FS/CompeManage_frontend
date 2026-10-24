import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import api from '@/api'
import { ElMessage } from 'element-plus'
import AwardChangeHistory from './AwardChangeHistory.vue'

vi.mock('@/api', () => ({
  default: { getAwardChanges: vi.fn() },
}))
vi.mock('element-plus', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    ElMessage: Object.assign(vi.fn(), {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  }
})

const CHANGES = [
  {
    id: 11,
    operator_name: '张老师',
    create_time: '2026-05-03 10:00',
    before: JSON.stringify({ project_name: '旧项目', status: 'draft' }),
    after: JSON.stringify({ project_name: '新项目', status: 'approved' }),
  },
  {
    id: 12,
    operator_name: '张老师',
    create_time: '2026-05-04 10:00',
    before: 'not-json',
    after: 'x',
  },
]

function mountComp(awardId = 5) {
  return mount(AwardChangeHistory, {
    props: { awardId },
    global: {
      plugins: [ElementPlus],
      stubs: {
        teleport: true,
        transition: false,
        // el-dialog 的 overlay/teleport 渲染在 jsdom 下不可见——内联替身保证内容进入 wrapper.html()
        'el-dialog': {
          props: ['modelValue'],
          template: '<div class="test-dialog" v-show="modelValue"><slot /></div>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AwardChangeHistory', () => {
  it('打开弹窗拉取记录并渲染 diff（含状态中文映射与解析失败降级）', async () => {
    api.getAwardChanges.mockResolvedValue({ data: { list: CHANGES } })
    const wrapper = mountComp(7)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.getAwardChanges).toHaveBeenCalledWith(7)
    // 时间线条目
    expect(wrapper.findAll('.el-timeline-item')).toHaveLength(2)
    // 第一条：字段/修改前/修改后（status 走中文映射：draft→待审核、approved→已通过）
    const body = wrapper.html()
    expect(body).toContain('项目名称')
    expect(body).toContain('旧项目')
    expect(body).toContain('新项目')
    expect(body).toContain('待审核')
    expect(body).toContain('已通过')
    // 第一条 diff 两字段（project_name、status）→ 2 行；第二条解析失败 → rows() 空 → 无行
    const rows = wrapper.findAll('.el-table__row')
    expect(rows.length).toBe(2)
  })

  it('无修改记录显示空态', async () => {
    api.getAwardChanges.mockResolvedValue({ data: { list: [] } })
    const wrapper = mountComp(1)
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.html()).toContain('暂无教师修改记录')
  })

  it('拉取失败提示（messageShown 时静默）', async () => {
    api.getAwardChanges.mockRejectedValue(new Error('服务不可用'))
    const wrapper = mountComp(2)
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('获取修改记录失败')

    api.getAwardChanges.mockRejectedValue(Object.assign(new Error('已提示'), { messageShown: true }))
    const w2 = mountComp(3)
    await w2.get('button').trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledTimes(1) // 第二次静默
  })
})
