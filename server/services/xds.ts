import axios from 'axios';

export interface VerifyXDSCreditParams {
  idNumber: string;
  consentRef: string;
}

export interface RetailAccount {
  creditorName: string;
  accountType: 'Retail Clothing' | 'Retail Furniture' | 'Micro-Lending' | 'Credit Card';
  accountNumber: string;
  currentBalance: number;
  monthlyInstallment: number;
  paymentStatus: 'Current' | 'Arrears' | 'Paid Up' | 'Written Off';
  lastUpdated: string;
}

export interface VerifyXDSCreditResult {
  score: number;
  riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';
  retailAccounts: RetailAccount[];
  rawResponse: any;
}

export interface VerifyXDSTraceParams {
  idNumber: string;
  consentRef: string;
}

export interface TraceAddress {
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  lastVerified: string;
}

export interface TracePhone {
  phoneNumber: string;
  phoneType: 'Cell' | 'Work' | 'Home';
  lastVerified: string;
}

export interface VerifyXDSTraceResult {
  addresses: TraceAddress[];
  phones: TracePhone[];
  rawResponse: any;
}

class XDSService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0; // Epoch milliseconds

  private getClientId(): string | undefined {
    return process.env.XDS_CLIENT_ID;
  }

  private getClientSecret(): string | undefined {
    return process.env.XDS_CLIENT_SECRET;
  }

  private getTokenUrl(): string {
    return process.env.XDS_TOKEN_URL || 'https://api.xds.co.za/oauth/token';
  }

  private getApiUrl(): string {
    return process.env.XDS_API_URL || 'https://api.xds.co.za';
  }

  private isSandbox(): boolean {
    return process.env.XDS_ENV === 'sandbox' || !this.getClientId() || !this.getClientSecret();
  }

  /**
   * OAuth 2.0 client credentials cached manager
   */
  public async getAuthToken(): Promise<string> {
    if (this.isSandbox()) {
      return 'mock-xds-token-98765';
    }

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
        throw new Error('No access_token returned from XDS token endpoint');
      }

      this.cachedToken = access_token;
      this.tokenExpiresAt = Date.now() + (expires_in * 1000);
      return this.cachedToken!;
    } catch (err: any) {
      console.error('[XDS] OAuth token retrieval failed:', err.message);
      throw new Error(`XDS Authentication Failed: ${err.message}`);
    }
  }

  /**
   * XDS Micro-Lending & Retail Data Bridge
   */
  public async getConsumerCredit(params: VerifyXDSCreditParams): Promise<VerifyXDSCreditResult> {
    const { idNumber, consentRef } = params;

    if (this.isSandbox()) {
      console.log(`[XDS] Sandbox mode active. Mocking XDS credit profile for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      let score = 760;
      let riskBand: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor' = 'Excellent';
      const retailAccounts: RetailAccount[] = [];

      if (idNumber.endsWith('1111')) {
        score = 380;
        riskBand = 'Very Poor';
        retailAccounts.push(
          { creditorName: 'Edgars Clothing', accountType: 'Retail Clothing', accountNumber: 'EDG-002', currentBalance: 8500, monthlyInstallment: 750, paymentStatus: 'Arrears', lastUpdated: '2026-06-01' },
          { creditorName: 'Lewis Furniture', accountType: 'Retail Furniture', accountNumber: 'LEW-554', currentBalance: 24000, monthlyInstallment: 1800, paymentStatus: 'Arrears', lastUpdated: '2026-05-15' },
          { creditorName: 'Wonga Finance', accountType: 'Micro-Lending', accountNumber: 'WON-109', currentBalance: 5000, monthlyInstallment: 1200, paymentStatus: 'Written Off', lastUpdated: '2026-04-10' }
        );
      } else if (idNumber.endsWith('2222')) {
        score = 550;
        riskBand = 'Poor';
        retailAccounts.push(
          { creditorName: 'Foschini Store', accountType: 'Retail Clothing', accountNumber: 'TFG-991', currentBalance: 4200, monthlyInstallment: 350, paymentStatus: 'Current', lastUpdated: '2026-06-10' },
          { creditorName: 'Lewis Furniture', accountType: 'Retail Furniture', accountNumber: 'LEW-555', currentBalance: 12500, monthlyInstallment: 950, paymentStatus: 'Arrears', lastUpdated: '2026-05-28' }
        );
      } else if (idNumber.endsWith('3333')) {
        score = 630;
        riskBand = 'Fair';
        retailAccounts.push(
          { creditorName: 'Truworths Group', accountType: 'Retail Clothing', accountNumber: 'TRU-432', currentBalance: 2500, monthlyInstallment: 250, paymentStatus: 'Current', lastUpdated: '2026-06-05' },
          { creditorName: 'Bradlows Furniture', accountType: 'Retail Furniture', accountNumber: 'BRA-102', currentBalance: 6000, monthlyInstallment: 500, paymentStatus: 'Current', lastUpdated: '2026-06-01' }
        );
      } else if (idNumber.endsWith('4444')) {
        score = 710;
        riskBand = 'Good';
        retailAccounts.push(
          { creditorName: 'Woolworths Card', accountType: 'Credit Card', accountNumber: 'WHL-876', currentBalance: 1500, monthlyInstallment: 150, paymentStatus: 'Paid Up', lastUpdated: '2026-06-11' },
          { creditorName: 'Edgars Clothing', accountType: 'Retail Clothing', accountNumber: 'EDG-001', currentBalance: 0, monthlyInstallment: 0, paymentStatus: 'Paid Up', lastUpdated: '2026-05-20' }
        );
      } else if (idNumber.endsWith('5555')) {
        // Fallback test case
        score = 590;
        riskBand = 'Fair';
        retailAccounts.push(
          { creditorName: 'Jet Clothing', accountType: 'Retail Clothing', accountNumber: 'JET-456', currentBalance: 3200, monthlyInstallment: 300, paymentStatus: 'Current', lastUpdated: '2026-06-08' },
          { creditorName: 'Finchoice Loan', accountType: 'Micro-Lending', accountNumber: 'FIN-789', currentBalance: 8000, monthlyInstallment: 900, paymentStatus: 'Current', lastUpdated: '2026-06-02' }
        );
      } else {
        retailAccounts.push(
          { creditorName: 'Markham clothing', accountType: 'Retail Clothing', accountNumber: 'MRK-210', currentBalance: 1200, monthlyInstallment: 100, paymentStatus: 'Current', lastUpdated: '2026-06-05' }
        );
      }

      const mockResponse = {
        transactionId: `mock-xds-credit-tx-${Date.now()}`,
        status: 'SUCCESS',
        creditResult: {
          idNumber,
          score,
          riskBand,
          accounts: retailAccounts,
          consentReference: consentRef,
        },
      };

      return {
        score,
        riskBand,
        retailAccounts,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        `${this.getApiUrl()}/v1/consumer/credit`,
        {
          idNumber,
          consentReference: consentRef,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );

      const data = response.data;
      const result = data.creditResult || data;
      const score = Number(result.score || 0);
      const riskBand = result.riskBand || 'Fair';
      const rawAccounts = result.accounts || [];

      const retailAccounts: RetailAccount[] = rawAccounts.map((acct: any) => ({
        creditorName: acct.creditorName,
        accountType: acct.accountType,
        accountNumber: acct.accountNumber,
        currentBalance: Number(acct.currentBalance || 0),
        monthlyInstallment: Number(acct.monthlyInstallment || 0),
        paymentStatus: acct.paymentStatus || 'Current',
        lastUpdated: acct.lastUpdated || new Date().toISOString().split('T')[0],
      }));

      return {
        score,
        riskBand,
        retailAccounts,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[XDS] consumer credit fetch failed:', err.message);
      throw new Error(`XDS credit bridge communication error: ${err.message}`);
    }
  }

  /**
   * Active Tracing Engine
   * Retrieves verified contact details forCollections workflows
   */
  public async getConsumerTrace(params: VerifyXDSTraceParams): Promise<VerifyXDSTraceResult> {
    const { idNumber, consentRef } = params;

    if (this.isSandbox()) {
      console.log(`[XDS] Sandbox mode active. Mocking active trace for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const addresses: TraceAddress[] = [
        { addressLine: 'Apartment 23C, Melrose Arch', city: 'Sandton', province: 'Gauteng', postalCode: '2076', lastVerified: '2026-05-12' },
        { addressLine: '124 Juta Street', city: 'Braamfontein', province: 'Gauteng', postalCode: '2001', lastVerified: '2025-11-20' }
      ];

      const phones: TracePhone[] = [
        { phoneNumber: '+27 82 555 0199', phoneType: 'Cell', lastVerified: '2026-06-01' },
        { phoneNumber: '+27 11 403 2199', phoneType: 'Work', lastVerified: '2026-03-15' }
      ];

      const mockResponse = {
        transactionId: `mock-xds-trace-tx-${Date.now()}`,
        status: 'SUCCESS',
        traceResult: {
          idNumber,
          addresses,
          phones,
          consentReference: consentRef,
        },
      };

      return {
        addresses,
        phones,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        `${this.getApiUrl()}/v1/consumer/trace`,
        {
          idNumber,
          consentReference: consentRef,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );

      const data = response.data;
      const result = data.traceResult || data;
      const addresses = result.addresses || [];
      const phones = result.phones || [];

      return {
        addresses,
        phones,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[XDS] trace fetch failed:', err.message);
      throw new Error(`XDS tracing engine communication error: ${err.message}`);
    }
  }
}

export const xdsService = new XDSService();
