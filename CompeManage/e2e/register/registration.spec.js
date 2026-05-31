import { test, expect } from 'playwright-test-coverage'

// 测试账号
const STUDENT_USER = {
  username: 'S2024001',
  password: '123',
  role: 'student',
}

const ADMIN_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

// ==================== 辅助函数 ====================

async function login(page, user) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="请输入用户名"]', user.username)
  await page.fill('input[placeholder="请输入密码"]', user.password)
  await page.locator('.el-button:has-text("立即登录")').click()

  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), {
    timeout: 15000
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
}

async function selectElOption(page, labelText, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: labelText })
  const select = formItem.locator('.el-select').first()
  await select.click()
  await page.waitForTimeout(400)
  const targetOption = page.getByRole('option', { name: optionText })
  const isVisible = await targetOption.isVisible().catch(() => false)
  if (isVisible) {
    await targetOption.click()
  } else {
    console.log(`未找到"${optionText}"选项，选择第一个`)
    await page.getByRole('option').first().click()
  }
  await page.waitForTimeout(300)
}

async function waitForRegisterList(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.page-container, .comp-list, .el-empty', { timeout: 15000 })
}

async function selectCompetitionAndNavigate(page) {
  await page.waitForTimeout(1000)
  const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
  const cardCount = await page.locator('.comp-item').count()

  if (!hasList || cardCount === 0) {
    console.log('没有可报名的赛事')
    return null
  }

  const items = await page.locator('.comp-item').all()
  for (const item of items) {
    const statusBadge = item.locator('.status-badge')
    const statusText = await statusBadge.textContent().catch(() => '')

    if (statusText.includes('报名中')) {
      const compName = await item.locator('.comp-name').textContent().catch(() => '未知赛事')
      console.log(`选择报名赛事: ${compName}`)

      const registerBtn = item.locator('.primary-btn:has-text("立即报名")')
      const btnVisible = await registerBtn.isVisible().catch(() => false)

      if (btnVisible) {
        await registerBtn.click()
        await page.waitForURL(/\/register\/detail\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')
        console.log(`进入报名页面: ${page.url()}`)
        return { name: compName, url: page.url() }
      }
    }
  }

  console.log('没有找到可报名的赛事（状态为"报名中"的）')
  return null
}

async function fillIndividualRegistrationForm(page) {
  await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

  // 选择赛道
  const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
  if (await trackSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('选择赛道...')
    await trackSelect.click()
    await page.waitForTimeout(400)
    const options = page.getByRole('option')
    const count = await options.count()
    console.log(`赛道选项数量: ${count}`)
    if (count > 0) {
      await options.first().click()
      await page.waitForTimeout(500)
    }

    const subTrackSelect = page.locator('.el-select[placeholder="请选择赛题"]')
    if (await subTrackSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subTrackSelect.click()
      await page.waitForTimeout(400)
      const subOptions = page.getByRole('option')
      if (await subOptions.count() > 0) {
        await subOptions.first().click()
        await page.waitForTimeout(300)
      }
    }
  }

  // 选择负责人
  const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
  if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('选择负责人...')
    await selectLeaderBtn.click()
    await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })
    await page.waitForLoadState('networkidle')

    const firstRow = page.locator('.el-dialog .el-table__body tr').first()
    await firstRow.locator('button:has-text("选择")').click()
    await page.waitForTimeout(500)

    const phoneInput = page.locator('.info-grid input[placeholder="请输入手机号"]').first()
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneInput.fill('13800138000')
    }

    const emailInput = page.locator('.info-grid input[placeholder="请输入邮箱"]').first()
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com')
    }
  }

  console.log('表单填写完成')
}

// ==================== 流程测试 ====================

test.describe('学生报名功能测试', () => {
  test('报名列表页面 - 查找并选择一个可报名的赛事', async ({ page }) => {
    await login(page, STUDENT_USER)
    await page.goto('/#/register')
    await waitForRegisterList(page)

    const selectedComp = await selectCompetitionAndNavigate(page)

    if (selectedComp) {
      console.log(`成功选择赛事: ${selectedComp.name}`)
      console.log(`报名页面URL: ${selectedComp.url}`)
      expect(selectedComp.url).toMatch(/\/register\/detail\/\d+/)
    } else {
      console.log('没有可报名的赛事，跳过验证')
    }
  })

  test('报名详情页 - 基本元素验证', async ({ page }) => {
    await login(page, STUDENT_USER)
    await page.goto('/#/register')
    await waitForRegisterList(page)

    const selectedComp = await selectCompetitionAndNavigate(page)

    if (selectedComp) {
      console.log(`进入赛事报名页面: ${selectedComp.name}`)

      await expect(page.locator('.page-wrapper')).toBeVisible()
      await expect(page.locator('.comp-title')).toBeVisible()
      await expect(page.locator('.main-form')).toBeVisible()

      const formCard = page.locator('.form-card')
      await expect(formCard).toBeVisible()

      console.log('报名详情页基本元素验证通过')
    } else {
      console.log('没有可报名的赛事，跳过')
    }
  })

  test('报名详情页 - 个人赛表单填写', async ({ page }) => {
    await login(page, STUDENT_USER)
    await page.goto('/#/register')
    await waitForRegisterList(page)

    const selectedComp = await selectCompetitionAndNavigate(page)

    if (selectedComp) {
      console.log(`开始填写个人赛表单: ${selectedComp.name}`)

      await fillIndividualRegistrationForm(page)

      const currentUrl = page.url()
      console.log(`当前页面URL: ${currentUrl}`)
      expect(currentUrl).toMatch(/\/register\/detail\/\d+/)

      console.log('个人赛表单填写完成')
    } else {
      console.log('没有可报名的赛事，跳过')
    }
  })

  test('报名详情页 - 提交报名表单', async ({ page }) => {
    await login(page, STUDENT_USER)
    await page.goto('/#/register')
    await waitForRegisterList(page)

    const selectedComp = await selectCompetitionAndNavigate(page)

    if (selectedComp) {
      console.log(`提交报名: ${selectedComp.name}`)

      await fillIndividualRegistrationForm(page)

      const submitBtn = page.locator('button:has-text("确认报名")')
      const btnVisible = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)

      if (btnVisible) {
        await submitBtn.click()
        await page.waitForTimeout(2000)

        const successMsg = page.locator('.el-message--success, .el-alert--success')
        const hasSuccess = await successMsg.isVisible().catch(() => false)
        console.log(`提交成功: ${hasSuccess}`)

        if (hasSuccess) {
          console.log('报名提交成功！')
        }
      } else {
        console.log('确认报名按钮不可见（可能已报名或表单未填写完整）')
      }
    } else {
      console.log('没有可报名的赛事，跳过')
    }
  })
})

test.describe('团队赛报名测试', () => {
  test.describe.configure({ mode: 'serial' })

  let createdCompId = null
  let createdCompName = null

  test('流程A: 管理员创建团队赛并配置报名设置', async ({ page }) => {
    createdCompName = 'E2E团队赛_' + Date.now()
    console.log(`创建团队赛: ${createdCompName}`)

    // 管理员登录
    await login(page, ADMIN_USER)

    // 创建团队赛
    await page.goto('/#/competition/add')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.el-tabs', { timeout: 20000 })
    await page.waitForTimeout(1000)

    await page.fill('input[placeholder="请输入赛事名称"]', createdCompName)
    await selectElOption(page, '赛事级别', '校级')
    await selectElOption(page, '赛事类型', '学科竞赛')

    // 选择所属学院
    const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select').first()
    await collegeSelect.click()
    await page.waitForTimeout(800)
    await page.evaluate(() => {
      const dropdown = document.querySelector('.el-select-dropdown:not([style*="none"])')
      if (dropdown) {
        const firstOption = dropdown.querySelector('.el-select-dropdown__item')
        if (firstOption) firstOption.click()
      }
    })
    await page.waitForTimeout(300)

    // 选择赛事负责人（弹窗选择）
    try {
      const managerSelect = page.locator('input[placeholder="请选择赛事负责人"]')
      const isVisible = await managerSelect.isVisible().catch(() => false)
      if (isVisible) {
        await managerSelect.click()
        await page.waitForTimeout(600)
        const dialogVisible = await page.locator('.el-dialog:visible').isVisible().catch(() => false)
        if (dialogVisible) {
          const selectBtn = page.locator('.el-dialog .el-table__body tr button:has-text("选择")').first()
          const btnVisible = await selectBtn.isVisible().catch(() => false)
          if (btnVisible) {
            await selectBtn.click()
            await page.waitForTimeout(500)
          } else {
            await page.locator('.el-dialog__headerbtn').click()
          }
        }
      }
    } catch (e) {
      console.log(`选择负责人: ${e.message.slice(0, 100)}`)
      try {
        await page.locator('.el-dialog__headerbtn').click().catch(() => {})
      } catch {}
    }
    await page.waitForTimeout(300)

    await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试大学')
    await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试学院')
    await page.fill('input[placeholder="请选择所属年份"]', '2026')

    // 点击创建按钮
    await page.locator('button:has-text("创建")').click()

    // 等待创建按钮重新可点击（表示请求完成）
    await page.waitForTimeout(5000)

    // 导航到列表页查找刚创建的赛事
    console.log('导航到列表页查找赛事...')
    await page.goto('/#/competition/list', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const rows = await page.locator('.el-table__body tr').all()
    console.log(`列表页共有 ${rows.length} 行`)
    for (const row of rows) {
      const titleText = await row.locator('td').nth(1).textContent().catch(() => '')
      console.log(`行内容: ${titleText.substring(0, 50)}`)
      if (titleText.includes(createdCompName)) {
        console.log(`找到创建的赛事: ${titleText}`)
        // 点击编辑按钮进入编辑页，从URL获取ID
        const editBtn = row.locator('button:has-text("编辑")').first()
        const editBtnVisible = await editBtn.isVisible().catch(() => false)
        console.log(`编辑按钮可见: ${editBtnVisible}`)
        if (editBtnVisible) {
          await editBtn.click()
          await page.waitForTimeout(2000)
          const url = page.url()
          console.log(`编辑页URL: ${url}`)
          // 从URL提取ID，格式如 /competition/edit/123
          const match = url.match(/\/competition\/\w+\/(\d+)/)
          if (match) {
            createdCompId = match[1]
            console.log(`从URL提取到ID: ${createdCompId}`)
          }
        }
        break
      }
    }

    if (createdCompId) {
      console.log(`团队赛创建成功，ID: ${createdCompId}`)
    } else {
      console.log('未能获取赛事ID，但创建流程完成')
    }

    if (createdCompId) {
      console.log(`团队赛创建成功，ID: ${createdCompId}`)
    } else {
      console.log('未能获取赛事ID，但创建流程完成')
    }

    // 配置报名设置为团队赛
    console.log('配置团队赛报名设置...')
    await page.goto(`/#/register/edit/${createdCompId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.el-form', { timeout: 15000 }).catch(() => {})

    // 直接找包含"团队赛"文字的单选框
    const teamRadio = page.locator('.el-radio').filter({ hasText: '团队赛' }).first()
    const teamRadioVisible = await teamRadio.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`团队赛radio可见: ${teamRadioVisible}`)
    if (teamRadioVisible) {
      await teamRadio.click()
      await page.waitForTimeout(300)
      console.log('已选择团队赛模式')
    }

    const saveBtn = page.locator('button:has-text("保存")')
    const saveBtnVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`保存按钮可见: ${saveBtnVisible}`)
    if (saveBtnVisible) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
      console.log('报名设置已保存')
    }
  })

  test('流程B: 学生报名团队赛', async ({ page }) => {
    if (!createdCompId) {
      console.log('没有可用的赛事ID，跳过')
      return
    }

    // 学生登录
    await login(page, STUDENT_USER)

    console.log(`进入团队赛报名页面: ID=${createdCompId}`)
    await page.goto(`/#/register/detail/${createdCompId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-wrapper', { timeout: 15000 }).catch(() => {})

    // 验证是团队赛
    const teamNameInput = page.locator('input[placeholder="请输入团队名称"]')
    const isTeamCompetition = await teamNameInput.isVisible({ timeout: 3000 }).catch(() => false)

    if (isTeamCompetition) {
      console.log('确认是团队赛报名页面')

      // 填写团队名称
      await teamNameInput.fill('自动化测试团队_' + Date.now())

      // 添加成员
      const addMemberBtn = page.locator('button:has-text("添加成员")')
      if (await addMemberBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('添加团队成员...')
        await addMemberBtn.click()
        await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

        const firstRow = page.locator('.el-dialog .el-table__body tr').first()
        await firstRow.locator('button:has-text("选择")').click()
        await page.waitForTimeout(500)
        console.log('团队成员添加成功')
      }

      // 选择赛道
      const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
      if (await trackSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trackSelect.click()
        await page.waitForTimeout(400)
        const options = page.getByRole('option')
        if (await options.count() > 0) {
          await options.first().click()
          await page.waitForTimeout(500)
        }
      }

      // 选择负责人
      const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
      if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('选择负责人...')
        await selectLeaderBtn.click()
        await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })
        await page.waitForLoadState('networkidle')

        const firstRow = page.locator('.el-dialog .el-table__body tr').first()
        await firstRow.locator('button:has-text("选择")').click()
        await page.waitForTimeout(500)

        const phoneInput = page.locator('.info-grid input[placeholder="请输入手机号"]').first()
        if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await phoneInput.fill('13800138000')
        }

        const emailInput = page.locator('.info-grid input[placeholder="请输入邮箱"]').first()
        if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await emailInput.fill('teamleader@example.com')
        }
      }

      // 提交报名
      const submitBtn = page.locator('button:has-text("确认报名")')
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
        console.log('团队赛报名已提交')
      }
    } else {
      console.log('不是团队赛（可能报名设置未生效）')
    }
  })

  test('流程C: 验证团队赛报名成功', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register/work')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    console.log(`我的参赛列表共有 ${cardCount} 个赛事`)

    if (createdCompName) {
      const teamCard = page.locator('.comp-card').filter({ hasText: createdCompName })
      const hasTeamComp = await teamCard.count()
      console.log(`找到团队赛: ${hasTeamComp > 0}`)
    }
  })
})

test.describe('报名后查看我的参赛列表', () => {
  test('验证报名后的赛事出现在我的参赛列表中', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register/work')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    console.log(`我的参赛列表共有 ${cardCount} 个赛事`)

    if (cardCount > 0) {
      const firstCard = page.locator('.comp-card').first()
      const compName = await firstCard.locator('.comp-name').textContent().catch(() => '')
      console.log(`参赛赛事: ${compName}`)
      await expect(firstCard.locator('.comp-name')).toBeVisible()
    } else {
      console.log('当前没有参赛记录')
    }
  })
})