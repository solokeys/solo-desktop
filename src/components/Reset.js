import React from 'react';
import { H1,H2,H3,H4,H5,
    Spinner, Classes, Button, Card, Tag, Overlay, Icon,
        Elevation, InputGroup, FormGroup} from "@blueprintjs/core";
import { timingSafeEqual } from 'crypto';
import GetPin from './GetPin';
const Comm = require('../comm');
const Constants = require('../../constants');


class GetYes extends React.Component {

    constructor(){
        super();
        this.state = {
            isOpen:true,
            pin:'',
            intent: 'none',
            error: '',
            loading: false,
        };
        this.onNo = this.onNo.bind(this);
        this.onYes= this.onYes.bind(this);
    }

    onNo(){
        if (this.props.onNo) this.props.onNo();
    }

    onYes(){
        if (this.props.onYes) this.props.onYes();
    }


    componentDidMount(){
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
                                <H2>Are you sure?</H2>
                                <div className="pt-2 pb-2">
                                    All of your credentials and PIN(s) will be deleted.  This is permanent.
                                </div>

                            </div>
                        </div>
                        <div className="d-flex flex-row bd-highlight justify-content-between pt-3">
                            <div className="col-2 p-0 bd-highlight">
                                <Button icon="cross" intent="danger" text="Cancel" className="p-3" onClick={this.onNo} />
                            </div>
                            <div className="col-4 p-0 bd-highlight mw-100">
                                <Button icon="arrow-right" intent="success" text="Yes, Continue" className="p-3 text-wrap" onClick={this.onYes} />
                            </div>
                        </div>
                    </div>
                </Card>
            </Overlay>
        );
    }
}




export default class ResetTab extends React.Component {
    constructor() {
        super();
        this.state = {
            loading: false,
            response: false,
            needYes: false,
            error:'',
        }
        this.onSubmit= this.onSubmit.bind(this);
        this.onYes = this.onYes.bind(this);
    }
    async onSubmit(){
        this.setState({needYes:true});
    }
    async onYes(){
        console.log('reset!');
        this.setState({ needYes: false, loading: true, response: false, error: '' });
        var res = await Comm.sendRecv('reset', this.props.device);
        this.setState({ loading: false, error: res.error, response:true});
    }


    render() {
        return (
            <div>
                {this.state.needYes &&
                    <GetYes isOpen={true} device={this.props.device} onYes={this.onYes}
                        onNo={()=>(this.setState({needYes:false, loading:false, response: false, error:''}))}/>
                }
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        <p>Reset device <span className="font-weight-bold"> {this.props.device.id}</span>.</p>
                    </div>
                    <div className="p-2 bd-highlight">
                        {
                            this.state.loading &&
                            <Spinner className="" intent="primary" size={45} />
                        }
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className="p-2 bd-highlight">
                        This will permanently delete all credentials and PIN(s) on device.
                    </div>
                </div>

                <div className="d-flex flex-row bd-highlight ">

                    <div className="p-2 bd-highlight">
                        <Button icon="trash" intent="danger"
                        disabled={this.state.loading}
                        text="Reset" className="p-3 text-wrap" onClick={this.onSubmit} />
                    </div>
                </div>
                <div className="d-flex flex-row bd-highlight ">
                    <div className=" p-2 bd-highlight">
                        {
                            (this.state.response || this.state.error) &&
                            (
                            this.state.error ? 
                                <div>
                                    <Icon icon="cross" intent="danger" />
                                    <Tag className="pl-2" intent="danger"><H5 className="mb-1">{this.state.error}</H5></Tag>
                                </div>
                            :
                                <H5>
                                    <Icon icon="tick" intent="success" />
                                    <span className="pl-2">Success</span>
                                </H5>
                            )
                        }
                        {
                            this.state.loading &&
                            <Spinner className="" intent="primary" size={45} />
                        }
                    </div>
                </div>
            </div>
        );
    }
}