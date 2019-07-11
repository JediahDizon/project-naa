// REACT
import React, { PureComponent } from "react";
import { UIManager, Platform, NetInfo, StatusBar } from "react-native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";

// REDUX
import { Provider } from "react-redux";
import { I18n } from "app/services";
import { configureStore } from "app/store";


// UTILS
import { Log } from "app/services";
import { Router } from "app/views";
import { Color } from "app/constants";

export default class extends PureComponent {
	constructor(props) {
		super(props);

		// Initialize Utilities and Services
		Platform.select({
			android: () => {
				Log.initialize();
			},
			ios: () => {

				// Connection Info for IOS always returns "unknown" because it's handled differently in this platform
				NetInfo.getConnectionInfo = async () => {
					return new Promise(resolve => {
						const connectionHandler = connectionInfo => {
							NetInfo.removeEventListener("connectionChange", connectionHandler);
							resolve(connectionInfo);
						};

						NetInfo.addEventListener("connectionChange", connectionHandler);
					});
				};
			}
		})();

		// For formatting a duration from a Moment JS object
		require("moment-duration-format");

		// Override the default message on translation error to return the key instead of an error message
		I18n.missingTranslation = I18n.getFullScope;

		// Redux Store initialization
		this.state = {
			store: configureStore()
		};
	}

	componentDidMount() {
		// Allow Aniamtions as per documentation found on "Layout Manager" API}
		UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
	}

	render() {
		// We separate the store from this file to allow "Hot Reloading"
		return (
			<Provider store={this.state.store}>
				<PaperProvider theme={{
					...DefaultTheme,
					dark: false,
					roundness: 5,
					colors: {
						...DefaultTheme.colors,
						primary: Color["BLUE"],
						accent: Color["BLUE 400"],
						disabled: Color["BLUE 200"],
						placeholder: Color["GREY 400"]
					}
				}}>
					<StatusBar backgroundColor={Color["RES INDIGO"]} />
					{
						/**
						 * Can't seem to place a <ScrollView> here for some reason. I'm guessing
						 * the Router is "Lazy" and when ScrollView loads it, it detects that
						 * there's nothing to load. Only a few seconds later, the router finally
						 * decides on a route to load. Sadly, it's too late. Just a speculation.
						 */
					}
					<Router />
				</PaperProvider>
			</Provider>
		);
	}
}
