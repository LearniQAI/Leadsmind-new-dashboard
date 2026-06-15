import axios from 'axios';

interface VerifyIdentityParams {
  idNumber: string;
  firstName: string;
  lastName: string;
  consentRef: string;
}

interface VerifyIdentityResult {
  idValid: boolean;
  nameMatch: boolean;
  aliveStatus: 'ALIVE' | 'DECEASED' | 'UNKNOWN';
  fraudIndicator: boolean;
  rawResponse: any;
}

export interface VerifyCreditScoreParams {
  idNumber: string;
  consentRef: string;
}

export interface VerifyCreditScoreResult {
  score: number;
  riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  rawResponse: any;
}

export interface VerifyCreditReportParams {
  idNumber: string;
  consentRef: string;
}

export interface VerifyCreditReportResult {
  score: number;
  riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  defaultsCount: number;
  judgementsCount: number;
  totalDebtExposure: number;
  monthlyRepayments: number;
  rawResponse: any;
}

class TransUnionService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0; // Epoch milliseconds

  private getClientId(): string | undefined {
    return process.env.TRANSUNION_CLIENT_ID;
  }

  private getClientSecret(): string | undefined {
    return process.env.TRANSUNION_CLIENT_SECRET;
  }

  private getTokenUrl(): string {
    return process.env.TRANSUNION_TOKEN_URL || 'https://api.transunion.co.za/oauth/token';
  }

  private getApiUrl(): string {
    return process.env.TRANSUNION_API_URL || 'https://api.transunion.co.za/identity/verify';
  }

  private isSandbox(): boolean {
    return process.env.TRANSUNION_ENV === 'sandbox' || !this.getClientId() || !this.getClientSecret();
  }

  /**
   * Secure background manager to handle token retrieval and caching.
   */
  public async getAuthToken(): Promise<string> {
    if (this.isSandbox()) {
      return 'mock-sandbox-token-12345';
    }

    // Cache lookup: check if token is valid and not expiring in next 30 seconds
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.cachedToken;
    }

    try {
      const response = await axios.post(
        this.getTokenUrl(),
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.getClientId()!,
          client_secret: this.getClientSecret()!,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      const { access_token, expires_in } = response.data;
      if (!access_token) {
        throw new Error('No access_token returned from TransUnion token endpoint');
      }

      this.cachedToken = access_token;
      // expires_in is usually in seconds
      this.tokenExpiresAt = Date.now() + (expires_in * 1000);
      return this.cachedToken!;
    } catch (err: any) {
      console.error('[TransUnion] OAuth retrieval failed:', err.message);
      throw new Error(`TransUnion Authentication Failed: ${err.message}`);
    }
  }

  /**
   * TransUnion ID Verification Gateway
   */
  public async verifyIdentity(params: VerifyIdentityParams): Promise<VerifyIdentityResult> {
    const { idNumber, firstName, lastName, consentRef } = params;

    // Sandbox / Mock fallback mode
    if (this.isSandbox()) {
      console.log(`[TransUnion] Sandbox mode active. Mocking check for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate latency

      // Default mock responses based on ID suffixes
      let aliveStatus: 'ALIVE' | 'DECEASED' | 'UNKNOWN' = 'ALIVE';
      let fraudIndicator = false;
      let nameMatch = true;
      let idValid = true;

      if (idNumber.endsWith('8080')) {
        aliveStatus = 'DECEASED';
        nameMatch = true;
        idValid = true;
      } else if (idNumber.endsWith('9999')) {
        aliveStatus = 'ALIVE';
        fraudIndicator = true;
        nameMatch = true;
        idValid = true;
      } else if (idNumber === '0000000000000') {
        idValid = false;
        nameMatch = false;
      }

      const mockResponse = {
        transactionId: `mock-tu-tx-${Date.now()}`,
        status: 'SUCCESS',
        verificationResult: {
          idNumber,
          idValid,
          nameMatch,
          aliveStatus,
          fraudIndicator,
          populationRegistryRef: consentRef,
        },
      };

      return {
        idValid,
        nameMatch,
        aliveStatus,
        fraudIndicator,
        rawResponse: mockResponse,
      };
    }

    // Production logic
    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        this.getApiUrl(),
        {
          idNumber,
          firstName,
          lastName,
          consentReference: consentRef,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      
      // Auto mapping logic to interpret the API response
      const idValid = !!data.idValid;
      const nameMatch = !!data.nameMatch;
      const aliveStatus = data.aliveStatus === 'DECEASED' ? 'DECEASED' : 
                          data.aliveStatus === 'ALIVE' ? 'ALIVE' : 'UNKNOWN';
      const fraudIndicator = !!data.fraudIndicator;

      return {
        idValid,
        nameMatch,
        aliveStatus,
        fraudIndicator,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[TransUnion] identity verify failed:', err.message);
      throw new Error(`TransUnion gateway communication error: ${err.message}`);
    }
  }

  /**
   * Thin Credit Score Gateway
   * Pipeline to look up credit score for initial pre-screening
   */
  public async getCreditScore(params: VerifyCreditScoreParams): Promise<VerifyCreditScoreResult> {
    const { idNumber, consentRef } = params;

    if (this.isSandbox()) {
      console.log(`[TransUnion] Sandbox mode active. Mocking credit score for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 600));

      let score = 785;
      let riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor' = 'Excellent';

      if (idNumber.endsWith('1111')) {
        score = 350;
        riskBand = 'Very Poor';
      } else if (idNumber.endsWith('2222')) {
        score = 580;
        riskBand = 'Poor';
      } else if (idNumber.endsWith('3333')) {
        score = 640;
        riskBand = 'Fair';
      } else if (idNumber.endsWith('4444')) {
        score = 720;
        riskBand = 'Good';
      }

      const mockResponse = {
        transactionId: `mock-tu-score-tx-${Date.now()}`,
        status: 'SUCCESS',
        scoreResult: {
          idNumber,
          score,
          riskBand,
          consentReference: consentRef,
        },
      };

      return {
        score,
        riskBand,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const baseUrl = process.env.TRANSUNION_API_URL_BASE || 'https://api.transunion.co.za';
      const response = await axios.post(
        `${baseUrl}/v1/credit/consumer/score`,
        {
          idNumber,
          consentReference: consentRef,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      const score = Number(data.score || data.scoreResult?.score || 0);
      const riskBand = data.riskBand || data.scoreResult?.riskBand || 'Fair';

      return {
        score,
        riskBand,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[TransUnion] credit score verify failed:', err.message);
      throw new Error(`TransUnion score gateway communication error: ${err.message}`);
    }
  }

  /**
   * Comprehensive Consumer Credit Report Interface
   * Pipeline mapping full response containing score, debt, defaults, judgements, and repayments
   */
  public async getCreditReport(params: VerifyCreditReportParams): Promise<VerifyCreditReportResult> {
    const { idNumber, consentRef } = params;

    if (this.isSandbox()) {
      console.log(`[TransUnion] Sandbox mode active. Mocking credit report for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let score = 785;
      let riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor' = 'Excellent';
      let defaultsCount = 0;
      let judgementsCount = 0;
      let totalDebtExposure = 12000;
      let monthlyRepayments = 450;

      if (idNumber.endsWith('1111')) {
        score = 350;
        riskBand = 'Very Poor';
        defaultsCount = 5;
        judgementsCount = 3;
        totalDebtExposure = 450000;
        monthlyRepayments = 12000;
      } else if (idNumber.endsWith('2222')) {
        score = 580;
        riskBand = 'Poor';
        defaultsCount = 2;
        judgementsCount = 1;
        totalDebtExposure = 220000;
        monthlyRepayments = 6500;
      } else if (idNumber.endsWith('3333')) {
        score = 640;
        riskBand = 'Fair';
        defaultsCount = 0;
        judgementsCount = 0;
        totalDebtExposure = 95000;
        monthlyRepayments = 3200;
      } else if (idNumber.endsWith('4444')) {
        score = 720;
        riskBand = 'Good';
        defaultsCount = 0;
        judgementsCount = 0;
        totalDebtExposure = 45000;
        monthlyRepayments = 1500;
      }

      const mockResponse = {
        transactionId: `mock-tu-report-tx-${Date.now()}`,
        status: 'SUCCESS',
        reportResult: {
          idNumber,
          score,
          riskBand,
          defaultsCount,
          judgementsCount,
          totalDebtExposure,
          monthlyRepayments,
          consentReference: consentRef,
          history: [
            { date: '2026-01-01', score: score - 10 },
            { date: '2026-03-01', score: score - 5 },
            { date: '2026-05-01', score: score }
          ]
        },
      };

      return {
        score,
        riskBand,
        defaultsCount,
        judgementsCount,
        totalDebtExposure,
        monthlyRepayments,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const baseUrl = process.env.TRANSUNION_API_URL_BASE || 'https://api.transunion.co.za';
      const response = await axios.post(
        `${baseUrl}/v1/credit/consumer/report`,
        {
          idNumber,
          consentReference: consentRef,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const data = response.data;
      const report = data.reportResult || data;
      
      const score = Number(report.score || 0);
      const riskBand = report.riskBand || 'Fair';
      const defaultsCount = Number(report.defaultsCount || 0);
      const judgementsCount = Number(report.judgementsCount || 0);
      const totalDebtExposure = Number(report.totalDebtExposure || 0);
      const monthlyRepayments = Number(report.monthlyRepayments || 0);

      return {
        score,
        riskBand,
        defaultsCount,
        judgementsCount,
        totalDebtExposure,
        monthlyRepayments,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[TransUnion] credit report fetch failed:', err.message);
      throw new Error(`TransUnion report gateway communication error: ${err.message}`);
    }
  }
}

export const transunionService = new TransUnionService();
