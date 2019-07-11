import React, { Component } from "react";
import { ScrollView, View, Alert, TouchableOpacity, Dimensions, Platform, SafeAreaView } from "react-native";
import { ActionConst, Actions, Scene, Router } from "react-native-router-flux";
import PopupMenu from "react-native-popup-menu-android";
import LinearGradient from "react-native-linear-gradient";
import { WhiteSpace } from "@ant-design/react-native";

// UTILS
import _ from "lodash";
import { Menu } from "app/components";
import * as Views from "app/views";
import { Color } from "app/constants";
import Utils from "./utils";

export default class extends Component {
	isLoggedIn() {
		return !_.isNil(_.get(this.props, "User.email"));
	}

	render() {

		/**
		* We use this to determine if the user is on tablet or a phone. With that
		* information, we can set the width of the sidebar. In this case, if the
		* device is a phone, it is 2/3 of the width. Otherwise, it's 1/3 of the screen.
		*/
		const { width, height } = Dimensions.get("window");
		const aspectRatio = height/width;

		return (
			<Router sceneStyle={{ backgroundColor: Color["BLUE GREY 50"] }}>
				<Scene key="root" navigationBarStyle={{ backgroundColor: Color["BLUE"] }} navBarButtonColor={Color["WHITE"]} hideNavBar>
					<Scene key="auth" hideNavBar>
						<Scene key="login" title="Login" component={loadFixedView(Views.Home)} hideNavBar />
					</Scene>

					{
						/**
						 * SCENE BUCKETS
						 *
						 * The concept of "Buckets" is used to utilize the automatically
						 * generated back button that appears on the top-left corner of
						 * the screen. For example, upon logging in, there shouldn't be
						 * a back button that is displayed that goes back the login page.
						 * Buckets can procedurally generate a back b7ton depending on
						 * the scene and it's siblings.
						 *
						 * NOTE
						 * This will cause a remounting of the component due to a state change.
						 * Only pass the secondary props when a component needs to reload.
						 */
					}

					{
						/**
						 * PRIMARY PAGES
						 *
						 * This bucket encapsulates the primary destinations of the application.
						 * Mainly, the Projects page, Sync, and user page. All of these pages
						 * must be accesible in the Sidebar.
						 *
						 * NOTE
						 * Don’t use a bottom navigation bar for fewer than three destinations (use tabs instead).
						 * Don’t use more than five destinations. For those cases, try tabs or a navigation drawer.
						 * https://material.io/design/components/bottom-navigation.html#usage
						 */
					}
					<Scene
						key="home"
						hideNavBar
						drawer={aspectRatio > 1.4}
						drawerPosition="right"
						gesturesEnabled={false}
						contentComponent={() => (
							<SafeAreaView style={{ flex: 1 }}>
								<Menu />
							</SafeAreaView>
						)}
						drawerWidth={width < 300 ? width * 2 / 3 : 300}
					>
						<Scene key="dashboard">
							<Scene
								type={ActionConst.RESET}
								key="projects"
								navBar={props => getNavBar({
									...props,
									centerComponent: <ProjectsTitle style={{ color: Color["WHITE"], ...aspectRatio > 1.4 ? { textAlign: "center" } : { textAlign: "left" }}} />,
									rightComponent: aspectRatio > 1.4 && renderHeaderActions([renderMenuButton({ onPress: Actions.drawerOpen })])
								})}
								component={loadFixedView(Views.PageOne)}
							/>
							<Scene
								back
								key="tasks"
								navBar={props => getNavBar({
									...props,
									leftComponent: renderHeaderActions([renderBackButton({ onPress: Actions.pop}), <Text style={{ color: Color["WHITE"], fontSize: 20, fontWeight: "bold" }}><TranslateText translations={Utils.translations} text="tasks" /></Text>]),
									rightComponent: <ProjectActions projectId={props.projectId} />
								})}
								component={loadFixedView(Views.PageTwo)}
							/>
						</Scene>
					</Scene>
				</Scene>
			</Router>
		);
	}

	/**
	 * RENDER MENU OPTIONS
	 *
	 * This function is called when the invoker needs the menu option shown based on the parameterized
	 * buttons. The returned JSX are intentionally encapsulated in a menu option
	 * considering this is mainly used for mobile phone devices; so that the header
	 * isn't cluttered.
	 *
	 * @param {array} options - THe array of buttons to render to the menu to popup
	 * @return {type} - The header menu option to render
	 */
	renderHeaderOptions(options) {
		_.isArray(options) && !_.isEmpty(options) && PopupMenu(
			options,
			selection => selection.onPress(),
			this.headerOptions
		);
	}
}


/**
 * LOAD VIEW
 *
 * This function is called by the React Native Router Flux library to pre-process
 * the view before it gets displayed. Mainly used to determine how to display the
 * header component considering each view has their own way of rendering the header.
 *
 * @param  {function} Component - The Component to load found in the `Views` directory
 * @param  {object} secondaryProps = {} - The props to pass to the header
 * @return {function} - The resulting React Component to render
 */
function loadView(Component, secondaryProps = {}) {
	return props => (
		<ScrollView nestedScrollEnabled>
			{
				!secondaryProps.hideNavBar ? (
					<SafeAreaView style={{ flex: 1 }}>
						<Component {...props} {...secondaryProps} />
					</SafeAreaView>
				) : (
					<Component {...props} {...secondaryProps} />
				)
			}
			<WhiteSpace margin={100} />
		</ScrollView>
	);
}

/**
 * LOAD FIXED VIEW
 *
 * This function helper is called if we do not want to render a component with a
 * scroll. In other words, we let the View being loaded handle its own scrolling.
 * An example is the Tasks where there are 2 columns with independent scroll.
 */
function loadFixedView(Component, secondaryProps = {}) {
	/**
	 * ASPECT RATIO
	 *
	 * We use the aspect ratio to determine the positioning of the well details.
	 * This will make the application know vaguely whether the user is using a
	 * tablet or a phone
	 */

	const { height, width } = Dimensions.get("window");
	const aspectRatio = height/width;

	return props => !secondaryProps.hideNavBar ? (
		<SafeAreaView style={{ flex: 1, flexDirection: "row" }}>
			<Component {...props} {...secondaryProps} />
		</SafeAreaView>
	) : (
		<Component {...props} {...secondaryProps} />
	);
}

function renderHeaderActions(toRender) {
	return (
		<View style={{ flexDirection: "row", alignItems: "center" }}>
			{
				_.map(_.compact(toRender), (a, index) => ( /* Compact gets rid of undefined values */
					<View key={index} style={{ marginRight: a === _.last(_.compact(toRender)) ? 0 : 20 }}>
						{ a }
					</View>
				))
			}
		</View>
	);
}

function renderBackButton(props) {
	return (
		<TouchableOpacity {...props} style={props.style}><Icon type="material-community" name="arrow-left" color={Color["WHITE"]} /></TouchableOpacity>
	);
}

function renderMenuButton(props) {
	return (
		<TouchableOpacity {...props} style={props.style}><Icon type="material-community" name="menu" color={Color["WHITE"]} /></TouchableOpacity>
	);
}

/**
 * GET NAVBAR
 *
 * As per requirement, the UI wil contain a custom navbar that apparently shows
 * icon and their respective titles. However, this design will not fit on the
 * default navbar. That is where this render function comes in. This will render
 * a custom header design that makes the icons fit.
 *
 * NOTE
 * This function relie son the "custom header" component of the React-native-elements library
 *
 * @param  {object} props - This contains the props for the custom header component
 * @return {JSX} - Header component to render in JSX
 */
function getNavBar(props) {
	const { width, height } = Dimensions.get("window");
	const aspectRatio = height/width;

	if(aspectRatio > 1.4) {
		return (
			<LinearGradient
				start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
				colors={[Color["RES INDIGO"], Color["RES PURPLE"]]}
				style={{ minHeight: Platform.select({ android: 60, ios: 100 }), paddingLeft: 20, paddingRight: 20 }}
			>
				<SafeAreaView style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0, ...props.outerContainerStyles }}>
					{/* Surrounding the views in a <SafeAreaView> doesn't seem to work properly */}
					<View style={{ flex: props.centerComponent ? 0.2 : 0.8, flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
						{ props.leftComponent }
					</View>
					<View style={{ flex: props.centerComponent ? 0.6 : 0, flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
						{/* <Image resizeMode="contain" source={Images.Logo} style={{ ...Utils.styles.headerImage, marginRight: 20 }} /> */}
						{ props.centerComponent }
					</View>
					<View style={{ flex: 0.2, flexDirection: "row", justifyContent: "flex-end" }}>
						{ props.rightComponent }
					</View>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient
			start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
			colors={[Color["RES INDIGO"], Color["RES PURPLE"]]}
			style={{ minHeight: Platform.select({ android: 60, ios: 100 }), paddingLeft: 20, paddingRight: 20 }}
		>
			<SafeAreaView style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0, ...props.outerContainerStyles }}>
				{/* Surrounding the views in a <SafeAreaView> doesn't seem to work properly */}
				<View style={{ flex: 3, flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
					{ props.leftComponent }
					{/* <Image resizeMode="contain" source={Images.Logo} style={{ ...Utils.styles.headerImage, marginRight: 20 }} /> */}
					{ props.centerComponent }
				</View>
				{
					props.rightComponent && (
						<View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end" }}>
							{ props.rightComponent }
						</View>
					)
				}
			</SafeAreaView>
		</LinearGradient>
	);
}
