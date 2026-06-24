import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

export const sqlServerConfig = {
  user: process.env.SQL_SERVER_USER || 'sa',
  password: process.env.SQL_SERVER_PASSWORD || 'password',
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'CriticalValueSystem',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true'
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

export const oracleConfig = {
  user: process.env.ORACLE_USER || 'HIS_USER',
  password: process.env.ORACLE_PASSWORD || 'HIS_PASSWORD',
  connectString: `${process.env.ORACLE_HOST || '10.1.253.31'}:${process.env.ORACLE_PORT || '1521'}/${process.env.ORACLE_SERVICE || 'ORCL'}`,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
};

export async function initSqlServerPool(): Promise<sql.ConnectionPool> {
  try {
    const pool = await sql.connect(sqlServerConfig);
    console.log('SQL Server连接池初始化成功');
    return pool;
  } catch (error) {
    console.error('SQL Server连接池初始化失败:', error);
    throw error;
  }
}

export async function getSqlServerConnection(): Promise<sql.ConnectionPool> {
  return sql.connect(sqlServerConfig);
}
