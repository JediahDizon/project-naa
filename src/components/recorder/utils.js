import _ from "lodash";

export default {

	/**
	 * Convert Decibel to Percent
	 *
	 * Since -160 is the lowerst decibel and 0 is
	 * the highest decibel point of the device's
	 * microphone, we map that to a formula that
	 * will convert it to a percentage.
	 *
	 * @param {int} toConvert - The input decibel value
	 * @return int - The converted value in percentage
	 */
	convertDecibelToPercent(toConvert) {
		// Linear
		// return toConvert * 0.625 + 100;

		// Parabolic
		return (.0039062 * Math.pow(toConvert, 2)) + (1.25 * toConvert) + 100;
	}
}