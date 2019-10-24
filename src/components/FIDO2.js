import React from 'react';
import { H3, Button, Card, Tag, Collapse, Classes, HTMLTable} from "@blueprintjs/core";

export default class FIDO2Tab extends React.Component {
    constructor() {
        super();
    }
    render() {
        return (
            <div>
                <p>Test FIDO2 features.</p>
                
                <HTMLTable className="bp3-html-table .modifier w-100">
                    {/* <thead>
                        <tr>
                            <th>Project</th>
                            <th>Description</th>
                            <th>Technologies</th>
                        </tr>
                    </thead> */}
                    <tbody>
                        <tr>
                            <td>
                                <Button icon="shield" intent="warning" text="Verify" />
                            </td>
                            <td>
                                <Button icon="user" intent="primary" text="Register" />
                            </td>
                            <td>
                                <Button icon="key" intent="success" text="Authenticate" />
                            </td>
                        </tr>
                    </tbody>
                </HTMLTable>
            </div>
        );
    }
}