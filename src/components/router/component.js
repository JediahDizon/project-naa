import React, { Component } from "react";
import { Dimensions } from "react-native";
import { Actions, Scene, Router } from "react-native-router-flux";

// COMPONENTS
import { Menu } from "app/components";
import * as Views from "app/views";

export default class Routes extends Component {
	render() {

		/**
		* We use this to determine if the user is on tablet or a phone. With that
		* information, we can set the width of the sidebar. In this case, it is 2/3
		* of the width of the screen.
		*/
		const { height, width } = Dimensions.get("window");

		return (
			<Router>
				<Scene key="root" hideNavBar>
					<Scene hideNavBar key="main" contentComponent={Menu} drawerWidth={width * 2 / 3}>
						<Scene key="Home" title="Home" component={Views.Home} leftTitle="☰" onLeft={() => Actions.drawerOpen()} />
					</Scene>
					<Scene key="pages">
						<Scene back key="PageOne" title="PageOne" component={Views.PageOne} />
						<Scene back key="PageTwo" title="PageTwo" component={Views.PageTwo} />
					</Scene>
				</Scene>
			</Router>
		);
	}
}
