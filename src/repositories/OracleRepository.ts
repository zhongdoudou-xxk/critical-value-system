import oracledb from 'oracledb';
import { oracleConfig } from '../config/database';

export interface OracleCriticalValue {
  XH: string;
  PATIENT_ID: string;
  PATIENT_NAME: string;
  PATIENT_GENDER: string;
  PATIENT_AGE: string;
  INPATIENT_NO: string;
  VISIT_ID: string;
  DEPARTMENT_ID: string;
  DEPARTMENT_NAME: string;
  WARD_BED: string;
  ATTENDING_DOCTOR_ID: string;
  ATTENDING_DOCTOR_NAME: string;
  ORDER_NO: string;
  TEST_NAME: string;
  TEST_ITEM_NAME: string;
  RESULT_VALUE: string;
  RESULT_UNIT: string;
  REFERENCE_RANGE: string;
  ABNORMAL_FLAG: string;
  CRITICAL_DESCRIPTION: string;
  TEST_DATETIME: Date;
  SENDFLAG: string;
  ZT: string;
}

export class OracleRepository {
  private pool: oracledb.Pool | null = null;

  async initPool(): Promise<void> {
    if (this.pool) return;
    
    try {
      this.pool = await oracledb.createPool({
        user: oracleConfig.user,
        password: oracleConfig.password,
        connectString: oracleConfig.connectString,
        poolMin: oracleConfig.poolMin,
        poolMax: oracleConfig.poolMax,
        poolIncrement: oracleConfig.poolIncrement
      });
      console.log('Oracle连接池初始化成功');
    } catch (error) {
      console.error('Oracle连接池初始化失败:', error);
      throw error;
    }
  }

  async getConnection(): Promise<oracledb.Connection> {
    if (!this.pool) {
      await this.initPool();
    }
    return this.pool!.getConnection();
  }

  async releaseConnection(conn: oracledb.Connection): Promise<void> {
    await conn.close();
  }

  async getUnsentCriticalValues(): Promise<OracleCriticalValue[]> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.getConnection();
      
      const result = await conn.execute(
        `SELECT 
          XH, PATIENT_ID, PATIENT_NAME, PATIENT_GENDER, PATIENT_AGE,
          INPATIENT_NO, VISIT_ID, DEPARTMENT_ID, DEPARTMENT_NAME, WARD_BED,
          ATTENDING_DOCTOR_ID, ATTENDING_DOCTOR_NAME, ORDER_NO, TEST_NAME,
          TEST_ITEM_NAME, RESULT_VALUE, RESULT_UNIT, REFERENCE_RANGE,
          ABNORMAL_FLAG, CRITICAL_DESCRIPTION, TEST_DATETIME, SENDFLAG, ZT
        FROM V_WEIJIZHI_PUSH
        WHERE SENDFLAG = '0'
        ORDER BY TEST_DATETIME DESC`
      );

      const rows = result.rows as any[] || [];
      return rows.map(row => this.mapRowToEntity(row));
    } finally {
      if (conn) await this.releaseConnection(conn);
    }
  }

  async updateSendFlag(xh: string): Promise<void> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.getConnection();
      await conn.execute(
        `UPDATE jy_weijiz
        SET SENDFLAG = '1', ZT = '已推送'
        WHERE XH = :xh`,
        { xh }
      );
      await conn.commit();
    } finally {
      if (conn) await this.releaseConnection(conn);
    }
  }

  async updateHandleResult(xh: string, handleResult: string): Promise<void> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.getConnection();
      await conn.execute(
        `UPDATE jy_weijiz
        SET ZT = :handleResult
        WHERE XH = :xh`,
        { handleResult, xh }
      );
      await conn.commit();
    } finally {
      if (conn) await this.releaseConnection(conn);
    }
  }

  async getDepartmentDoctors(departmentId: string): Promise<Array<{ DOCTOR_ID: string; DOCTOR_NAME: string; WECHAT_USER_ID: string }>> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.getConnection();
      const result = await conn.execute(
        `SELECT DOCTOR_ID, DOCTOR_NAME, WECHAT_USER_ID
        FROM gy_zhigongxx
        WHERE DEPARTMENT_ID = :departmentId
        AND IS_ACTIVE = '1'
        ORDER BY IS_DEPARTMENT_HEAD DESC`
      );
      
      const rows = result.rows as any[] || [];
      return rows.map(row => ({
        DOCTOR_ID: row[0],
        DOCTOR_NAME: row[1],
        WECHAT_USER_ID: row[2]
      }));
    } finally {
      if (conn) await this.releaseConnection(conn);
    }
  }

  private mapRowToEntity(row: any[]): OracleCriticalValue {
    return {
      XH: row[0],
      PATIENT_ID: row[1],
      PATIENT_NAME: row[2],
      PATIENT_GENDER: row[3],
      PATIENT_AGE: row[4],
      INPATIENT_NO: row[5],
      VISIT_ID: row[6],
      DEPARTMENT_ID: row[7],
      DEPARTMENT_NAME: row[8],
      WARD_BED: row[9],
      ATTENDING_DOCTOR_ID: row[10],
      ATTENDING_DOCTOR_NAME: row[11],
      ORDER_NO: row[12],
      TEST_NAME: row[13],
      TEST_ITEM_NAME: row[14],
      RESULT_VALUE: row[15],
      RESULT_UNIT: row[16],
      REFERENCE_RANGE: row[17],
      ABNORMAL_FLAG: row[18],
      CRITICAL_DESCRIPTION: row[19],
      TEST_DATETIME: row[20],
      SENDFLAG: row[21],
      ZT: row[22]
    };
  }
}
