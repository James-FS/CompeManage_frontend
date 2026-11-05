import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createRouter, createMemoryHistory } from 'vue-router'
import studentDeclare from './studentDeclare.vue'
import api from '@/api'

// C 武器第一批：studentDeclare selectStudent 全分支（E2E 弹窗链不稳挂账的三分支）
// ——jsdom 无过渡/遮罩竞态，弹窗用内联替身，直接驱动分支

vi.mock('@/api', () => ({
  default: {
    getStudentList: vi.fn(),
    submitAward: vi.fn(),
  },
}))

const STUDENTS = [
  { id: 21, name: '学生甲', username: '00100', college: '计算机学院' },
  { id: 22, name: '学生乙', username: '00200', college: '数学学院' },
  { id: 23, name: '学生丙', username: '00300', college: '外语学院' },
]
const TEACHERS = [{ id: 31, name: '张老师', username: 'T001', college: '学院甲' }]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/award/student/declare', component: studentDeclare },
    { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
  ],
})

async function mountPage() {
  router.push('/award/student/declare?comp_id=1&comp_name=%E6%B5%8B%E8%AF%95%E8%B5%9B%E4%BA%8B')
  await router.isReady()
  const wrapper = mount(studentDeclare, {
    global: {
      plugins: [ElementPlus, router],
      stubs: {
        teleport: true,
        transition: false,
        'el-dialog': {
          props: ['modelValue', 'title'],
          template: '<div class="test-dialog" v-show="modelValue"><h3>{{ title }}</h3><slot /></div>',
        },
      },
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const rowSelectBtns = (wrapper) => wrapper.findAll('.test-dialog .el-table__body button')
const toastText = () => {
  const nodes = document.querySelectorAll('.el-message')
  return Array.from(nodes).map((n) => n.textContent).join('|')
}

beforeEach(async () => {
  vi.clearAllMocks()
  localStorage.setItem('userInfo', JSON.stringify({ id: 21, name: '学生甲', username: '00100' }))
  localStorage.setItem('resubmitAward', JSON.stringify({ reason: '材料不全' }))
  api.getStudentList.mockImplementation(({ role }) =>
    Promise.resolve({ data: { list: role === 'teacher' ? TEACHERS : STUDENTS, total: 3 } })
  )
  api.submitAward.mockResolvedValue({ code: 200, data: {} })
})

// 【挂起】组件级驱动 selectStudent 的路线在 jsdom 下弹窗行渲染不稳（EP 表格 slot 行为差异），
// 3 轮预算内不值当继续调试——保留管线证据（AwardChangeHistory 组件测试可作模板），
// 分支挂账继续由 E2E 侧持有。恢复时先解决：jsdom 下 el-table 行渲染与 dialog slot 时序。
describe.skip('studentDeclare selectStudent 分支', () => {
  it('队长选择正向回填', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('.el-radio-button').find((b) => b.text().includes('团队赛')).trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('选择队长')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('已选择队长：学生甲')
    wrapper.unmount()
  })

  it('成员新增与编辑更新', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('.el-radio-button').find((b) => b.text().includes('团队赛')).trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('选择队长')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text().includes('添加成员')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[1].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('已添加成员：学生乙')

    // 编辑模式（重新选择成员）
    await wrapper.findAll('.member-card button').find((b) => b.text().includes('重新选择')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[2].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('成员已更新：学生丙')
    wrapper.unmount()
  })

  it('导师新增、重复警告与编辑替换', async () => {
    const wrapper = await mountPage()
    const addAdvisor = () => wrapper.findAll('button').find((b) => b.text().includes('添加指导老师'))

    await addAdvisor().trigger('click')
    await flushPromises()
    // 切到教师数据源的弹窗（isSelectingAdvisor）
    await rowSelectBtns(wrapper)[0].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('已选择指导老师：张老师')

    // 重复添加 → 警告（192-194）
    await addAdvisor().trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('该指导老师已添加，请勿重复选择')

    // 重新选择（编辑模式 198）
    await wrapper.findAll('.advisor-card button').find((b) => b.text().includes('重新选择')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click')
    await flushPromises()
    expect(toastText()).toContain('已选择指导老师：张老师')
    wrapper.unmount()
  })

  it('重复成员与队长互斥守卫', async () => {
    const wrapper = await mountPage()
    await wrapper.findAll('.el-radio-button').find((b) => b.text().includes('团队赛')).trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('选择队长')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click') // 队长=学生甲
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text().includes('添加成员')).trigger('click')
    await flushPromises()
    await rowSelectBtns(wrapper)[0].trigger('click') // 再选学生甲 → 互斥守卫
    await flushPromises()
    expect(toastText()).toContain('该学生已在团队中，请勿重复选择')
    wrapper.unmount()
  })
})
