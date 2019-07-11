import React from "react";
import { ErrorBoundary } from "app/components";
import Component from "./component";

export default props => <ErrorBoundary><Component {...props} /></ErrorBoundary>;
