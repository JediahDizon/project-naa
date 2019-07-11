import React, { PureComponent } from "react";
import { Text, Card } from "react-native-paper";

/**
 * Error Boundary
 *
 * This is a React component that wraps rendered components inside
 * a boundary so that any errors that the rendered component throws will be
 * caught and thus prevents the entire application from crashing.
 */

export default class ErrorBoundary extends PureComponent {
	state = { error: null, errorInfo: null };

	componentDidCatch(error, errorInfo) {
		this.setState({
			error,
			errorInfo
		});
	}

	render() {
		const { error = {}, errorInfo = {} } = this.state;
		if(error) {
			return (
				<Card>
					<Card.Content>
						<Text style={{ marginBottom: 10 }}>{ error.message }</Text>
					</Card.Content>
				</Card>
			);
		}

		return this.props.children;
	}
}
