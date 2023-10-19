
const awsCredentials = (config) => {
  let { healthlake } = window;
  if (!healthlake) {
    const sHealthLake = window.localStorage.getItem("healthlake");
    if (sHealthLake) {
      healthlake = window.healthlake = JSON.parse(sHealthLake);
    }
  }
  const credentials = {
    secretAccessKey: healthlake?.awsSecretAccessKey || config.awsSecretAccessKey,
    accessKeyId: healthlake?.awsAccessKeyID || config.awsAccessKeyID,
    service: "medical-imaging"
  };

  return credentials
};

export default awsCredentials;