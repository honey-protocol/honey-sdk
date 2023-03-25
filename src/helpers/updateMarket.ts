import fetch from 'node-fetch';
/**
 * @description calls upon the updateMarket route of the Honeyfinance API
 * @params marketId: type string
 * @returns response 
*/
export const updateMarket = async (
  marketId: string,
) => {
  const payload = { marketId: marketId };
  
  try {
    const response = await fetch('https://honeyfinance.xyz/updateMarket', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload })
    });

    const outcome = await response.json();
    
    console.log('@@-- outcome', outcome);
    return outcome; 
  } catch (error) {
    return [];
  }
};