import React from 'react';
import { H1,H2,H3,H4,H5,
    Spinner, Classes, Button, Card, Tag, Overlay, Icon,
        Elevation, InputGroup, FormGroup} from "@blueprintjs/core";
import { timingSafeEqual } from 'crypto';
const Comm = require('../comm');
const Constants = require('../../constants');
                




export default class GetPin extends React.Component {

    constructor(){
        super();
        this.state = {
            isOpen:true,
            pin:'',
            intent: 'none',
            error: '',
            loading: false,
        };
        this.onClose = this.onClose.bind(this);
        this.onCancel= this.onCancel.bind(this);
        this.onContinue= this.onContinue.bind(this);
        this.onPINChange= this.onPINChange.bind(this);
    }

    onClose(){
        this.setState({isOpen: false})
    }
    onCancel(){
        this.setState({isOpen: false})
        if (this.props.onCancel){
            this.props.onCancel();
        }
    }
    async onContinue(){
        this.setState({error: '', intent: 'none'});
        if (this.state.pin.length < 4){
            console.log(this.state.pin);
            this.setState({error: 'PIN must be at least 4 characters.', intent: 'danger'});
        }

        var device = this.props.device;
        device.pin = this.state.pin;

        this.setState({loading:true});
        var res = await Comm.sendRecv('getPinToken', device);
        this.setState({loading:false});

        if (res.error){
            this.setState({error: res.error, intent: 'danger'});
            return;
        }
        console.log('res:', res);

        if (this.props.onContinue){
            console.log('Passing pinToken...');
            this.props.onContinue(this.state.pin, res.pinToken);
        }
        this.setState({isOpen: false})


    }

    onPINChange(e,){
        this.setState({pin: e.target.value})
    }

    componentDidMount(){
        console.log('PROPS: ' ,this.props);
        this.setState({isOpen: this.props.isOpen})
    }

    render(){
        return (
            <Overlay isOpen={true} onClose={this.onClose} 
                className={Classes.OVERLAY_SCROLL_CONTAINER + ""}
                autoFocus={true}
                canEscapeKeyClose={true}
                canOutsideClickClose={true}
                enforceFocus={true}
                hasBackdrop={true}
                usePortal={true}
                useTallContent={false}
            >
                <Card elevation={Elevation.FOUR} className="docs-overlay-example-transition abs-center">
                    <div className="p-3">
                        <div className="d-flex flex-row bd-highlight ">
                            <div className="p-0 bd-highlight">
                                <H2>PIN required.</H2>
                                <div className="pt-2 pb-2">
                                    Type in your PIN for this security key to continue.
                                </div>
                                <InputGroup
                                    className=""
                                    leftIcon="lock"
                                    placeholder="Your PIN"
                                    large={true}
                                    type="password"
                                    intent={this.state.intent}
                                    onChange={this.onPINChange}
                                    rightElement={this.state.loading && <Spinner className="" intent="primary" size={20} />}
                                />
                                {this.state.error && 
                                    <Tag intent="danger" className="mt-2 mb-2">
                                        <H5 className="mb-1">
                                            {this.state.error}
                                        </H5>
                                    </Tag>
                                }
                            </div>
                        </div>
                        <div className="d-flex flex-row bd-highlight justify-content-between pt-3">
                            <div className="col-2 p-0 bd-highlight">
                                <Button icon="cross" intent="danger" text="Cancel" className="p-3" onClick={this.onCancel} />
                            </div>
                            <div className="col-2 p-0 bd-highlight mw-100">
                                <Button icon="arrow-right" intent="success" text="Continue" className="p-3 text-wrap" onClick={this.onContinue} />
                            </div>
                        </div>
                    </div>
                </Card>
            </Overlay>
        );
    }
}

