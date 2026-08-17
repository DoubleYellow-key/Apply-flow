// 字段同义词词典:纯规则匹配的核心资产,覆盖常见网申表单的中文字段表述
// 匹配时先精确后包含(见 matcher.ts),term 越长优先级越高

export interface FieldRule {
  /** 档案字段路径(相对 profile 根或条目根) */
  path: string
  /** 同义词 */
  terms: string[]
}

/** 顶层单值字段 */
export const FIELD_RULES: FieldRule[] = [
  {
    path: 'basic.name',
    terms: ['姓名', '名字', '您的姓名', '申请人姓名', '考生姓名', '学生姓名', '姓名 '],
  },
  { path: 'basic.gender', terms: ['性别'] },
  {
    path: 'basic.birthDate',
    terms: ['出生日期', '出生年月', '生日', '出生年月日', '出生'],
  },
  {
    path: 'basic.phone',
    terms: ['手机号码', '手机号', '联系电话', '联系方式', '手机', '电话号码', '电话', '联系手机', '移动电话'],
  },
  {
    path: 'basic.email',
    terms: ['电子邮箱', '电子邮件', '邮箱', 'E-mail', 'Email', 'email', 'EMAIL', '邮件地址', '联系邮箱'],
  },
  {
    path: 'basic.idNumber',
    terms: ['身份证号码', '身份证号', '证件号码', '身份证', '证件号', '身份证件号码'],
  },
  { path: 'basic.nationality', terms: ['民族', '族别'] },
  {
    path: 'basic.politicalStatus',
    terms: ['政治面貌', '政治身份', '党员身份'],
  },
  { path: 'basic.maritalStatus', terms: ['婚姻状况', '婚姻情况', '婚否'] },
  {
    path: 'basic.nativePlace',
    terms: ['籍贯', '户口所在地', '户籍所在地', '户籍地', '户口', '户籍'],
  },
  {
    path: 'basic.originPlace',
    terms: ['生源地', '生源地区', '生源所在地', '生源'],
  },
  {
    path: 'basic.currentCity',
    terms: ['现居住地', '现居住城市', '现居城市', '居住城市', '居住地', '现住址', '所在城市', '常驻城市'],
  },
  { path: 'basic.height', terms: ['身高'] },
  {
    path: 'intention.city',
    terms: ['期望工作城市', '期望城市', '意向城市', '意向工作地', '期望工作地', '期望地点', '工作地点意向', '期望工作地点'],
  },
  {
    path: 'intention.position',
    terms: ['期望岗位', '期望职位', '意向岗位', '意向职位', '应聘岗位', '应聘职位', '求职意向'],
  },
  {
    path: 'intention.salary',
    terms: ['期望薪资', '期望薪酬', '薪资要求', '期望薪水', '年薪期望', '期望年薪', '薪资期望'],
  },
  {
    path: 'intention.availability',
    terms: ['到岗时间', '可到岗时间', '最快到岗时间', '入职时间', '可入职时间', '到职时间'],
  },
  {
    path: 'selfEvaluation',
    terms: ['自我评价', '个人评价', '自我介绍', '个人简介', '个人优势', '自我描述', '个人陈述'],
  },
]

/** 重复区块(多条目)识别规则:匹配区块标题 */
export const REPEATER_RULES: FieldRule[] = [
  {
    path: 'educations',
    terms: ['教育经历', '教育背景', '学习经历', '学历信息', '教育信息', '教育情况', '教育'],
  },
  {
    path: 'works',
    terms: ['实习经历', '实习经验', '工作经历', '工作及实习经历', '工作/实习经历', '实习或工作经历', '工作与实习经历', '实习', '工作'],
  },
  {
    path: 'projects',
    terms: ['项目经历', '项目经验', '项目情况', '项目'],
  },
  {
    path: 'awards',
    terms: ['获奖情况', '获奖经历', '荣誉奖项', '获奖与证书', '奖项', '获奖', '证书情况', '荣誉'],
  },
  {
    path: 'family',
    terms: ['家庭成员及社会关系', '家庭成员', '家庭信息', '家庭情况', '社会关系', '家庭背景', '家庭成员信息'],
  },
]

/** 重复区块内条目字段的同义词(相对条目根) */
export const ITEM_FIELD_RULES: Record<string, FieldRule[]> = {
  educations: [
    {
      path: 'school',
      terms: ['毕业院校', '学校名称', '就读院校', '院校名称', '学校名称', '院校', '学校', '大学名称', '大学'],
    },
    { path: 'college', terms: ['学院', '院系'] },
    { path: 'major', terms: ['专业名称', '所学专业', '专业'] },
    { path: 'degree', terms: ['最高学历', '学历层次', '学历'] },
    { path: 'degreeType', terms: ['学位类型', '学位'] },
    {
      path: 'startDate',
      terms: ['入学时间', '在校开始时间', '就读开始时间', '开始时间', '起始时间', '入学年月', '入学日期'],
    },
    {
      path: 'endDate',
      terms: ['毕业时间', '离校时间', '结束时间', '毕业年月', '毕业日期', '预计毕业时间'],
    },
    { path: 'rank', terms: ['成绩排名', '专业排名', '排名情况', '排名'] },
    { path: 'gpa', terms: ['GPA', '绩点', '平均成绩', '平均学分绩点'] },
    { path: 'mode', terms: ['培养方式', '学习方式', '就读方式'] },
  ],
  works: [
    { path: 'company', terms: ['单位名称', '公司名称', '实习单位', '工作单位', '公司', '单位'] },
    { path: 'position', terms: ['职位名称', '担任职务', '岗位名称', '职务', '职位', '岗位'] },
    {
      path: 'startDate',
      terms: ['开始时间', '入职时间', '实习开始时间', '起始时间', '开始日期', '开始年月'],
    },
    {
      path: 'endDate',
      terms: ['结束时间', '离职时间', '实习结束时间', '结束日期', '结束年月'],
    },
    {
      path: 'description',
      terms: ['工作内容', '工作描述', '实习内容', '工作职责', '主要职责', '职责描述', '工作业绩', '内容', '描述'],
    },
  ],
  projects: [
    { path: 'name', terms: ['项目名称', '项目名', '项目'] },
    { path: 'role', terms: ['担任角色', '担任职务', '角色', '职责'] },
    { path: 'startDate', terms: ['开始时间', '起始时间', '开始日期', '开始年月'] },
    { path: 'endDate', terms: ['结束时间', '结束日期', '结束年月'] },
    {
      path: 'description',
      terms: ['项目描述', '项目内容', '项目简介', '项目详情', '内容', '描述'],
    },
  ],
  awards: [
    { path: 'name', terms: ['奖项名称', '获奖名称', '奖励名称', '证书名称', '名称', '奖项'] },
    { path: 'date', terms: ['获奖时间', '获得时间', '证书时间', '时间', '日期'] },
  ],
  family: [
    { path: 'relation', terms: ['与本人关系', '成员关系', '关系', '称谓'] },
    { path: 'name', terms: ['成员姓名', '姓名', '名字'] },
    { path: 'age', terms: ['年龄'] },
    { path: 'company', terms: ['工作单位', '单位名称', '单位'] },
    { path: 'position', terms: ['工作职务', '职务', '职位'] },
    { path: 'politicalStatus', terms: ['政治面貌'] },
  ],
}

/** 选项匹配的同义/归一映射(档案值 <-> 页面选项文案) */
export const OPTION_ALIASES: Record<string, string[]> = {
  男: ['男', '男性', 'M', 'male'],
  女: ['女', '女性', 'F', 'female'],
  已婚: ['已婚', '已婚已育', 'S'],
  未婚: ['未婚', '单身', 'U'],
  中共党员: ['中共党员', '党员', '中国共产党党员'],
  中共预备党员: ['中共预备党员', '预备党员', '中共候补党员'],
  共青团员: ['共青团员', '团员', '中国共产主义青年团团员'],
  群众: ['群众', '无党派人士', '普通群众'],
  博士研究生: ['博士研究生', '博士', '研究生(博士)', '博士研究生及以上'],
  硕士研究生: ['硕士研究生', '硕士', '研究生', '研究生(硕士)'],
  本科: ['本科', '大学本科', '学士', '全日制本科'],
  大专: ['大专', '专科', '大学专科'],
  全日制: ['全日制', '统招', '全日制统招'],
  非全日制: ['非全日制', '在职'],
  学士: ['学士', '本科', '工学学士'],
  硕士: ['硕士', '硕士研究生', '工学硕士'],
  博士: ['博士', '博士研究生'],
}
