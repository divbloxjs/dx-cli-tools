import { exec } from "child_process";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

let cliToolName = "my-cli";

export const parseInputArguments = () => {
    let parsedArgs = { unknowns: [] };
    if (!Array.isArray(process.argv)) {
        handleError("Invalid arguments");
    }

    let currentArgName = "unknowns";
    process.argv.forEach((arg, idx) => {
        if (arg.charAt(0) === "-") {
            currentArgName = arg;
            parsedArgs[arg] = [];
        } else {
            parsedArgs[currentArgName].push(arg);
        }
    });

    return parsedArgs;
};

export const processParsedArguments = (parsedArgs = {}) => {
    let processedArgs = parsedArgs;
    delete processedArgs.unknowns;
    Object.keys(processedArgs).forEach((argName) => {
        if (!Object.keys(supportedArguments).includes(argName)) {
            handleError(`Invalid argument: ${argName}`);
        }
    });

    return processedArgs;
};

export const outputSupportedUsage = async () => {
    const usage = {};
    Object.keys(supportedArguments).map((argumentName) => {
        const argName = supportedArguments[argumentName].name;
        if (!usage.hasOwnProperty(argName)) {
            usage[argName] = {
                Flags: [argumentName],
                Options: supportedArguments[argumentName].allowedOptions ?? [],
                Description: supportedArguments[argumentName].description,
            };
        } else {
            usage[argName].Flags.push(argumentName);
        }
    });

    console.log(`${cliToolName} CLI usage below: `);
    console.table(usage);
};

export const handleError = (message = "No message provided") => {
    console.log(`ERROR: Something went wrong. Run '${cliToolName} -h' for supported usage`);
    throw new Error(message);
};

const help = {
    name: "help",
    description: "Prints the currently supported usage of the CLI",
    f: async () => {
        await outputSupportedUsage();
    },
};

const version = {
    name: "version",
    description: `Prints the currently installed version of the ${cliToolName} CLI`,
    f: () => {
        const localPackageJSONPath = pathToFileURL(`${process.cwd()}/node_modules/${cliToolName}/package.json`);
        try {
            const fileContentStr = readFileSync(localPackageJSONPath, { encoding: "utf-8" }).toString();
            const packageJSON = JSON.parse(fileContentStr);
            const localVersion = packageJSON.version;
            console.log(`${cliToolName} CLI local version: ${localVersion}`);
        } catch (err) {
            console.log(`Unable to retrieve info for ${cliToolName} CLI local version\n`, err);
        }

        const { stdout } = exec(`npm list -g ${cliToolName}`);
        stdout.on("data", (data) => {
            const posStartOfVersionNumber = data.toString().indexOf(cliToolName) + cliToolName.length + 1;
            const remainingString = data.toString().substring(posStartOfVersionNumber, data.toString().length);

            console.log(`${cliToolName} CLI global version: ${remainingString}`);
        });
    },
};

const supportedArguments = {
    "-h": help,
    "--help": help,
    "-v": version,
    "--version": version,
};

/**
 * @typedef runParams
 * @property {Object<string, supportedArgument>} supportedArguments
 * @property {string} cliName
 */

/**
 * @typedef supportedArgument
 * @property {string} name
 * @property {string} description
 * @property {string[]} allowedOptions
 * @property {Function} f
 */

/**
 * Main entry function that creates the CLI program
 * @param {runParams} runParams
 */
export const run = async (runParams = {}) => {
    cliToolName = runParams?.cliToolName ?? "my-cli";

    Object.keys(runParams?.supportedArguments ?? {}).forEach((argName) => {
        supportedArguments[argName] = runParams.supportedArguments[argName];
    });

    const parsedArgs = parseInputArguments();
    const processedArgs = processParsedArguments(parsedArgs);

    if (Object.keys(processedArgs).length === 0) {
        console.log(`No input flags provided. Run '${cliToolName} -h' for supported usage.`);
        process.exit(1);
    }

    for (const argName of Object.keys(processedArgs)) {
        await supportedArguments[argName].f.call(this, ...processedArgs[argName]);
    }
};
