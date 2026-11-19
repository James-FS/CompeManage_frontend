const noticeTypes = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.ppt,.pptx'
const officeTypes = '.pdf,.doc,.docx,.xls,.xlsx,.csv'
const awardProofTypes = '.jpg,.jpeg,.png,.pdf,.doc,.docx'

export const fileUploadPolicies = {
  notice: {
    accept: noticeTypes,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '支持 PDF、Word、Excel、JPG、PNG、PPT、ZIP等常见格式',
  },
  notice_attachment: {
    accept: noticeTypes,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '支持 PDF、Word、Excel、JPG、PNG、PPT、ZIP等常见格式',
  },
  declare_attachment: {
    accept: officeTypes,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '支持 PDF、Word、Excel 等常见文档；单个文件不超过 30 MB。',
  },
  summary_attachment: {
    accept: `${officeTypes},.zip,.rar`,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '支持 PDF、Word、Excel、ZIP 等常见格式；单个文件不超过 30 MB。',
  },
  reg_attachment: {
    accept: `${officeTypes},.zip`,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '支持 PDF、Word、Excel、ZIP 等项目材料；最多 5 个文件，单个文件不超过 30 MB。',
  },
  competition_work: {
    accept: noticeTypes,
    maxSizeMb: 30,
    maxFiles: 10,
    multiple: true,
    helperText: '支持 PDF、Word、Excel、图片、PPT、ZIP 等作品材料；单个文件不超过 30 MB。',
  },
  award_cert: {
    accept: awardProofTypes,
    maxSizeMb: 30,
    maxFiles: 1,
    multiple: false,
    helperText: '支持 JPG、PNG、PDF、Word；单个文件不超过 30 MB。',
  },
  award_proof: {
    accept: awardProofTypes,
    maxSizeMb: 30,
    maxFiles: 1,
    multiple: false,
    helperText: '支持 JPG、PNG、PDF、Word；单个文件不超过 30 MB。',
  },
  temp: {
    accept: noticeTypes,
    maxSizeMb: 30,
    maxFiles: 5,
    multiple: true,
    helperText: '单个文件不超过 30 MB。',
  },
}

export const importFilePolicies = {
  competitionDirectory: {
    accept: '.xlsx,.xls',
    maxSizeMb: 20,
    helperText: '支持 XLS、XLSX；文件不超过 20 MB。',
  },
  awardImport: {
    accept: '.xlsx',
    maxSizeMb: 20,
    helperText: '支持 XLSX；文件不超过 20 MB。',
  },
}
