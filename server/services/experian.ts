import axios from 'axios';

export interface VerifyLivenessParams {
  idNumber: string;
  selfieBase64: string;
  consentRef: string;
}

export interface VerifyLivenessResult {
  livenessPassed: boolean;
  matchConfidence: number;
  dhaPhotoMatched: boolean;
  result: string;
  rawResponse: any;
}

export interface DocumentOCRResult {
  extractedData: {
    idNumber?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    documentNumber?: string;
    // For utility bill
    creditorName?: string;
    accountNumber?: string;
    billingAddress?: string;
    issueDate?: string;
  };
  rawResponse: any;
}

export interface GeocodeAddressResult {
  verifiedAddress: string;
  latitude: number;
  longitude: number;
  result: string;
  rawResponse: any;
}

class ExperianService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0; // Epoch milliseconds

  private getClientId(): string | undefined {
    return process.env.EXPERIAN_CLIENT_ID;
  }

  private getClientSecret(): string | undefined {
    return process.env.EXPERIAN_CLIENT_SECRET;
  }

  private getTokenUrl(): string {
    return process.env.EXPERIAN_TOKEN_URL || 'https://api.experian.co.za/oauth/token';
  }

  private getApiUrl(): string {
    return process.env.EXPERIAN_API_URL || 'https://api.experian.co.za/trueid';
  }

  private isSandbox(): boolean {
    return process.env.EXPERIAN_ENV === 'sandbox' || !this.getClientId() || !this.getClientSecret();
  }

  /**
   * Secure background manager to handle Experian token retrieval and caching.
   */
  public async getAuthToken(): Promise<string> {
    if (this.isSandbox()) {
      return 'mock-experian-token-abcde';
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
        throw new Error('No access_token returned from Experian token endpoint');
      }

      this.cachedToken = access_token;
      this.tokenExpiresAt = Date.now() + (expires_in * 1000);
      return this.cachedToken!;
    } catch (err: any) {
      console.error('[Experian] OAuth token retrieval failed:', err.message);
      throw new Error(`Experian Authentication Failed: ${err.message}`);
    }
  }

  /**
   * Biometric Liveness check against DHA database photos
   */
  public async verifyBiometricLiveness(params: VerifyLivenessParams): Promise<VerifyLivenessResult> {
    const { idNumber, selfieBase64, consentRef } = params;

    if (this.isSandbox()) {
      console.log(`[Experian TrueID] Sandbox mode active. Mocking liveness for ID: ${idNumber}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      let livenessPassed = true;
      let matchConfidence = 92;
      let dhaPhotoMatched = true;
      let result = 'Liveness Passed: Confidence 92%';

      if (idNumber.endsWith('1111')) {
        livenessPassed = false;
        matchConfidence = 32;
        dhaPhotoMatched = false;
        result = 'Liveness Failed: Confidence below 40% (Spoof Detected)';
      }

      const mockResponse = {
        transactionId: `mock-exp-trueid-liveness-${Date.now()}`,
        status: 'SUCCESS',
        livenessResult: {
          idNumber,
          livenessPassed,
          matchConfidence,
          dhaPhotoMatched,
          popiaConsentReference: consentRef,
        },
      };

      return {
        livenessPassed,
        matchConfidence,
        dhaPhotoMatched,
        result,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        `${this.getApiUrl()}/v1/biometric/liveness`,
        {
          idNumber,
          selfie: selfieBase64,
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
      const resVal = data.livenessResult || data;
      const livenessPassed = !!resVal.livenessPassed;
      const matchConfidence = Number(resVal.matchConfidence || 0);
      const dhaPhotoMatched = !!resVal.dhaPhotoMatched;
      const result = livenessPassed 
        ? `Liveness Passed: Confidence ${matchConfidence}%`
        : `Liveness Failed: Confidence ${matchConfidence}%`;

      return {
        livenessPassed,
        matchConfidence,
        dhaPhotoMatched,
        result,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[Experian TrueID] biometric liveness failed:', err.message);
      throw new Error(`Experian TrueID biometric bridge error: ${err.message}`);
    }
  }

  /**
   * Automated Document OCR Processor
   */
  public async processDocumentOCR(fileBuffer: Buffer, documentType: string): Promise<DocumentOCRResult> {
    if (this.isSandbox()) {
      console.log(`[Experian TrueID] Sandbox mode active. Mocking Document OCR for type: ${documentType}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      let extractedData: DocumentOCRResult['extractedData'] = {};

      if (documentType === 'utility_bill') {
        extractedData = {
          creditorName: 'City of Johannesburg',
          accountNumber: '109283-A',
          billingAddress: 'Apartment 23C, Melrose Arch, Sandton',
          issueDate: new Date().toISOString().split('T')[0],
        };
      } else {
        extractedData = {
          idNumber: '8808085082222',
          firstName: 'Lerato',
          lastName: 'Mokoena',
          dateOfBirth: '1988-08-08',
          gender: 'Female',
          nationality: 'South African',
          documentNumber: 'SMID-8808-9923',
        };
      }

      const mockResponse = {
        transactionId: `mock-exp-trueid-ocr-${Date.now()}`,
        status: 'SUCCESS',
        ocrResult: {
          documentType,
          extractedData,
        },
      };

      return {
        extractedData,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        `${this.getApiUrl()}/v1/document/ocr`,
        {
          documentType,
          file: fileBuffer.toString('base64'),
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
      const ocrResult = data.ocrResult || data;
      const extractedData = ocrResult.extractedData || {};

      return {
        extractedData,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[Experian TrueID] Document OCR failed:', err.message);
      throw new Error(`Experian TrueID OCR engine error: ${err.message}`);
    }
  }

  /**
   * Experian Consumer & Geocoded Address Bridge
   */
  public async verifyAndGeocodeAddress(address: string): Promise<GeocodeAddressResult> {
    if (this.isSandbox()) {
      console.log(`[Experian TrueID] Sandbox mode active. Mocking Geocode Address: ${address}`);
      await new Promise((resolve) => setTimeout(resolve, 600));

      let latitude = -33.9249;
      let longitude = 18.4241; // Default Cape Town
      let verifiedAddress = address;
      let result = 'Verified & Geocoded';

      if (address.toLowerCase().includes('melrose arch')) {
        latitude = -26.1314;
        longitude = 28.0673;
        verifiedAddress = 'Apartment 23C, Melrose Arch, Melrose Blvd, Birnam, Johannesburg, 2076';
      } else if (address.toLowerCase().includes('juta')) {
        latitude = -26.1923;
        longitude = 28.0366;
        verifiedAddress = '124 Juta Street, Braamfontein, Johannesburg, 2001';
      } else if (address.toLowerCase().includes('invalid')) {
        latitude = 0;
        longitude = 0;
        result = 'Unverified';
      }

      const mockResponse = {
        transactionId: `mock-exp-address-tx-${Date.now()}`,
        status: 'SUCCESS',
        geocodeResult: {
          inputAddress: address,
          verifiedAddress,
          coordinates: { latitude, longitude },
          result,
        },
      };

      return {
        verifiedAddress,
        latitude,
        longitude,
        result,
        rawResponse: mockResponse,
      };
    }

    try {
      const token = await this.getAuthToken();
      const response = await axios.post(
        `${this.getApiUrl()}/v1/address/verify-geocode`,
        { address },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      const geocodeResult = data.geocodeResult || data;
      const coordinates = geocodeResult.coordinates || { latitude: 0, longitude: 0 };

      return {
        verifiedAddress: geocodeResult.verifiedAddress || address,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        result: geocodeResult.result || 'Verified & Geocoded',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[Experian TrueID] Address verification and geocoding failed:', err.message);
      throw new Error(`Experian address bridge communication error: ${err.message}`);
    }
  }
}

export const experianService = new ExperianService();
