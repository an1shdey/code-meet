const JUDGE0_API = "https://ce.judge0.com"; // public Judge0 endpoint

const LANGUAGE_VERSIONS = {
  javascript: { language_id: 63 },
  python: { language_id: 71 },
  java: { language_id: 62 },
};

/**
 * Function to execute code
 * @param {string} language - selected language (js/python/java)
 * @param {string} code - user code
 * @param {string} input - stdin input
 * @returns {Promise<{success:boolean, output?:string, error?: string}>}
 */
export async function executeCode(language, code, input = "") {
  try {
    const languageConfig = LANGUAGE_VERSIONS[language];

    // if language not supported → return error
    if (!languageConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    const submitResponse = await fetch(
      `${JUDGE0_API}/submissions?base64_encoded=false&wait=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageConfig.language_id,
          stdin: input,
        }),
      }
    );

    if (!submitResponse.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${submitResponse.status}`,
      };
    }

    const submitData = await submitResponse.json();
    const token = submitData.token;

    let result;
    while (true) {
      const resultResponse = await fetch(
        `${JUDGE0_API}/submissions/${token}?base64_encoded=false`
      );

      result = await resultResponse.json();

      if (result.status.id <= 2) {
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }

      break;
    }

    const output = result.stdout || "";
    const stderr = result.stderr || result.compile_output || "";

    // if runtime or compile error
    if (stderr) {
      return {
        success: false,
        output: output,
        error: stderr,
      };
    }

    // success case
    return {
      success: true,
      output: output || "No output",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute code: ${error.message}`,
    };
  }
}

// helper function
function getFileExtension(language) {
  const extensions = {
    javascript: "js",
    python: "py",
    java: "java",
  };

  return extensions[language] || "txt";
}