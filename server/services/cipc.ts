/**
 * CIPC Corporate Directory Service Client (South Africa)
 * Simulates real-time corporate business lookups for compliance and KYC mapping.
 */

export interface CIPCDirector {
  name: string;
  role: string;
  idNumberSuffix: string;
}

export interface CIPCCompany {
  companyName: string;
  registrationNumber: string;
  registrationDate: string;
  status: 'Active' | 'Deregistration Process' | 'Deregistered';
  physicalAddress: string;
  directors: CIPCDirector[];
}

class CIPCService {
  // Local South African company registry mock database
  private registry: CIPCCompany[] = [
    {
      companyName: 'Zafro Logistics (Pty) Ltd',
      registrationNumber: '2019/382910/07',
      registrationDate: '2019-04-12',
      status: 'Active',
      physicalAddress: '12 Waterfront Road, Cape Town, 8001',
      directors: [
        { name: 'Lungile Dlamini', role: 'Director', idNumberSuffix: '5082088' },
        { name: 'Zukisa Khanyile', role: 'Director', idNumberSuffix: '5081081' }
      ]
    },
    {
      companyName: 'Khanyile Holdings (Pty) Ltd',
      registrationNumber: '2021/482019/07',
      registrationDate: '2021-09-23',
      status: 'Active',
      physicalAddress: '45 Sandton Drive, Johannesburg, 2196',
      directors: [
        { name: 'Zukisa Khanyile', role: 'Director', idNumberSuffix: '5081081' },
        { name: 'Sibusiso Khanyile', role: 'Director', idNumberSuffix: '6091092' }
      ]
    },
    {
      companyName: 'Pretorius Construction (Pty) Ltd',
      registrationNumber: '2015/192837/07',
      registrationDate: '2015-02-14',
      status: 'Active',
      physicalAddress: '88 Schoeman Street, Pretoria, 0002',
      directors: [
        { name: 'Johan Pretorius', role: 'Director', idNumberSuffix: '4072077' },
        { name: 'Hendrik Pretorius', role: 'Director', idNumberSuffix: '4112111' }
      ]
    },
    {
      companyName: 'Cape Town Real Estate Co',
      registrationNumber: '2018/271828/07',
      registrationDate: '2018-07-07',
      status: 'Active',
      physicalAddress: '202 Loop Street, Cape Town, 8001',
      directors: [
        { name: 'Sarah Jenkins', role: 'Director', idNumberSuffix: '8052055' },
        { name: 'Lungile Dlamini', role: 'Director', idNumberSuffix: '5082088' }
      ]
    }
  ];

  /**
   * Search CIPC database by company name or registration number
   */
  public async searchCompany(query: string): Promise<CIPCCompany[]> {
    console.log(`[CIPC Registry] Performing search query: "${query}"`);
    if (!query) return [];

    const normQuery = query.toLowerCase().trim();
    
    // Filter matching companies
    return this.registry.filter(
      c => c.companyName.toLowerCase().includes(normQuery) || 
           c.registrationNumber.replace(/\//g, '').includes(normQuery.replace(/\//g, ''))
    );
  }
}

export const cipcService = new CIPCService();
