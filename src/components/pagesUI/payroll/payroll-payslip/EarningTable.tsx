import { earningData } from "@/data/payroll/earning-data";
const EarningTable = () => {
  const totalAmount = earningData.reduce((sum, item) => sum + item?.amount, 0);
  return (
    <>
        <div className="table__wrapper meeting-table table-responsive">
          <table className="table mb-[20px] w-full">
            <thead>
              <tr className="table__title">
                <th>Earning</th>
                <th>Title</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody className="table__body">
              {earningData.map((earning, index) => (
                <tr key={index}>
                  <td>{earning.earning}</td>
                  <td>{earning.title}</td>
                  <td>{earning.type}</td>
                  <td>{earning.amount}</td>
                </tr>
              ))}
              <tr>
                <td></td>
                <td></td>
                <td>Total</td>
                <td>${totalAmount}</td>
              </tr>
            </tbody>
          </table>
        </div>
    </>
  );
};

export default EarningTable;
