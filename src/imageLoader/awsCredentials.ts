
const awsCredentials = (config) => {
  let { healthimaging } = window;
  if (!healthimaging) {
    const sHealthImaging = window.localStorage.getItem("healthimaging");
    if (sHealthImaging) {
      healthimaging = window.healthimaging = JSON.parse(sHealthImaging);
    }
  }
  const credentials = {
    secretAccessKey: healthimaging?.awsSecretAccessKey || config.awsSecretAccessKey,
    accessKeyId: healthimaging?.awsAccessKeyID || config.awsAccessKeyID,
    sessionToken: healthimaging?.awsSessionToken || config.awsSessionToken,
    service: "medical-imaging"
  };

  return credentials
};

export default awsCredentials;
