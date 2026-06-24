const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function createTestCriticalValue() {
  try {
    const response = await axios.post(`${BASE_URL}/api/critical-values`, {
      hl7MessageId: `TEST_PUSH_${Date.now()}`,
      sourceSystem: 0,
      patientId: `P${Date.now()}`,
      patientName: '测试患者',
      patientGender: '男',
      patientAge: '45',
      departmentId: 1,
      departmentName: '急诊科',
      wardBed: '1床',
      attendingDoctorId: 1,
      attendingDoctorName: '张医生',
      testName: '血常规',
      testItemName: '白细胞计数',
      resultValue: '30.5',
      resultUnit: '×10^9/L',
      referenceRange: '4-10',
      abnormalFlag: 'H',
      criticalDescription: '危急值：白细胞严重升高，提示严重感染',
      status: 'Pending',
      escalationLevel: 0
    });

    console.log('创建成功！');
    console.log('危急值ID:', response.data.id);
    console.log('消息:', response.data.message);
  } catch (error) {
    console.error('创建失败:', error.response?.data || error.message);
  }
}

async function getAllCriticalValues() {
  try {
    const response = await axios.get(`${BASE_URL}/api/critical-values`);
    console.log('危急值列表:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('获取失败:', error.response?.data || error.message);
  }
}

async function handleCriticalValue(id) {
  try {
    const response = await axios.post(`${BASE_URL}/api/critical-values/handle`, {
      criticalValueId: id,
      doctorId: 1,
      action: 3,
      comment: '测试处理：患者已转入ICU'
    });

    console.log('处理成功！');
    console.log(response.data);
  } catch (error) {
    console.error('处理失败:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('危急值测试工具');
  console.log('='.repeat(30));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--create')) {
    await createTestCriticalValue();
  } else if (args.includes('--list')) {
    await getAllCriticalValues();
  } else if (args.includes('--handle')) {
    const id = args[args.indexOf('--handle') + 1];
    if (id) {
      await handleCriticalValue(id);
    } else {
      console.error('请指定危急值ID: --handle <id>');
    }
  } else {
    console.log('可用命令:');
    console.log('  --create    创建测试危急值');
    console.log('  --list      获取所有危急值');
    console.log('  --handle    处理危急值 --handle <id>');
  }
}

main();
