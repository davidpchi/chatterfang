import axios from "axios";

const matchHistorySubmitEndpoint =
    "https://docs.google.com/forms/d/e/1FAIpQLScguPsS2TOxaABYLtbCDZ5zPXec2av9AI2kPI2JFwYqmghBYQ/formResponse";

/**
 * Sends data to a public Google Form via its form endpoint.
 *
 * @async
 * @function
 * @param {Object.<string, string>} params.formData - An object containing form field names as keys and their values as values. Field names should be without the 'entry.' prefix.
 * @param {string} params.submitEndpoint - The URL endpoint of the Google Form to which the data should be posted.
 * @returns {Promise<boolean>} Returns `true` if the data submission was successful (or assumed to be successful), `false` otherwise.
 */
export async function sendDataToGoogleSheets({
    formData,
    submitEndpoint
}) {
    // This is all super hacky to begin so bear with me here...
    // We are able to directly submit to the google form via a URL and POST. No auth needed since this a public form.
    // This is pretty fragile because if any of the above fields have their IDs change or are deleted
    // this will result in a 400.

    const prefixedBody = Object.keys(formData).reduce(
        (acc, key) => {
            acc["entry." + key] = formData[key];
            return acc;
        },
        {}
    );

    try {
        await axios
            .post(submitEndpoint, prefixedBody, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                withCredentials: false
            })

        console.log("Sucessfully submitted data.");
        return true;
    } catch (e) {
        // just assume the data entry was successful
        console.log("Error submitting data.");
        return false;
    }
};

export const submitMatch = async (
    date,
    player1,
    player2,
    player3,
    player4,
    turnCount,
    extraNotes,
    firstKOTurn,
    timeLength
) => {
    const formData = {};
    formData["1178471159"] = new Date(date).toISOString().split("T")[0];

    if (player1) {
        formData["2132042053"] = player1.name;
        formData["961836116"] = player1.commander;
        formData["1252336227"] = player1.turnOrder.toString();
        formData["147625596"] = player1.rank.toString();
    }

    if (player2) {
        formData["840407098"] = player2.name;
        formData["493870522"] = player2.commander;
        formData["898724110"] = player2.turnOrder.toString();
        formData["531480374"] = player2.rank.toString();
    }

    if (player3) {
        formData["2099339267"] = player3.name;
        formData["1961193649"] = player3.commander;
        formData["87571757"] = player3.turnOrder.toString();
        formData["807216034"] = player3.rank.toString();
    }

    if (player4) {
        formData["575868019"] = player4.name;
        formData["270994715"] = player4.commander;
        formData["153957972"] = player4.turnOrder.toString();
        formData["652184592"] = player4.rank.toString();
    }

    formData["676929187"] = turnCount !== undefined ? turnCount.toString() : "";

    formData["2043626966"] = extraNotes !== undefined ? extraNotes : "";

    formData["1755577221"] = firstKOTurn !== undefined ? firstKOTurn.toString() : "";

    formData["861944794"] = timeLength !== undefined ? timeLength.toString() : "";

    // This is all super hacky to begin so bear with me here...
    // We are able to directly submit to the google form via a URL and POST. No auth needed since this a public form.
    // This is pretty fragile because if any of the above fields have their IDs change or are deleted
    // this will result in a 400.
    return sendDataToGoogleSheets({ formData, submitEndpoint: matchHistorySubmitEndpoint });
};
