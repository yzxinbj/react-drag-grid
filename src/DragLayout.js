import React, { PureComponent } from "react";
import {
  Layout,
  Button,
  Icon,
  Modal,
  Form,
  Input,
  Tooltip,
  Radio,
  message,
} from "antd";
import { WidthProvider, Responsive } from "react-grid-layout";
import _ from "lodash";
import ReactEcharts from "echarts-for-react";
import { getBarChart, getLineChart, getPieChart } from "./chart";
const { TextArea } = Input;
const ResponsiveReactGridLayout = WidthProvider(Responsive);
const { Header, Content } = Layout;

/*
  let data = {
    1631799682542: {
      position: {},
      formData: {}
    }
  }
*/
export default Form.create()(
  class DragLayout extends PureComponent {
    static defaultProps = {
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 100,
    };

    constructor(props) {
      super(props);

      this.state = {
        // 存储页面所有的图表位置信息
        layouts: this.getFromLS("layouts") || {},
        widgets: [],
        visible: false,
        // 当前编辑图表ID
        currentChartId: "",
        // 存储编辑图表数据
        editFormData: {},
      };
    }

    getFromLS(key) {
      let ls = {};
      if (global.localStorage) {
        try {
          ls = JSON.parse(global.localStorage.getItem("rgl-8")) || {};
        } catch (e) {
          /*Ignore*/
        }
      }
      return ls[key];
    }

    saveToLS(key, value) {
      if (global.localStorage) {
        global.localStorage.setItem(
          "rgl-8",
          JSON.stringify({
            [key]: value,
          })
        );
      }
    }
    generateDOM = () => {
      return _.map(this.state.widgets, (l, i) => {
        
        let option;
        if (l.type === "bar") {
          option = getBarChart();
        } else if (l.type === "line") {
          option = getLineChart();
        } else if (l.type === "pie") {
          option = getPieChart();
        }
        let component = (
          <ReactEcharts
            option={option}
            notMerge={true}
            lazyUpdate={true}
            style={{ width: "100%", height: "100%" }}
          />
        );
        return (
          <div key={l.i} data-grid={l}>
            <span className="edit" onClick={this.onEditItem.bind(this, l)}>
              <Icon type="form" />
            </span>
            <span className="remove" onClick={this.onRemoveItem.bind(this, i,l)}>
              <Icon type="close" />
            </span>
            {component}
          </div>
        );
      });
    };

    addChart(type) {
      const addItem = {
        x: (this.state.widgets.length * 3) % (this.state.cols || 12),
        y: 0, // puts it at the bottom
        w: 3,
        h: 2,
        type: type,
        i: new Date().getTime().toString(),
        static: false,
      };
      this.setState({
        widgets: this.state.widgets.concat({
          ...addItem,
        }),
      })
    }
    addNewChart(data) {
      const value = data.position;
      const addItem = {
        x: value.x,
        y: value.y,
        w: value.w,
        h: value.h,
        type: value.type,
        i: value.i,
        static: value.x ? true : false,
      };
      this.setState(
        {
          widgets: this.state.widgets.concat({
            ...addItem,
          }),
        },
        () => {
          console.log('widgets', this.state.widgets)
        }
      )
    }

    onRemoveItem(i,l) {
      const currentId = l.i + "";
      delete this.state.editFormData[currentId]
      this.setState({
        widgets: this.state.widgets.filter((item, index) => index !== i),
      });
    }
    onEditItem = (l) => {
      const currentChartId = l.i + "";
      const { editFormData } = this.state;
      const currentEdit = editFormData[currentChartId];
      const data = currentEdit ? currentEdit.formData || "" : "";
      // 回显用户编辑信息
      if (data) {
        this.props.form.setFieldsValue({
          title: data.title || "",
          legend: data.legend || "",
          SQL: data.SQL || "",
          tooltip: data.tooltip || "",
        });
      }
      this.setState({
        visible: true,
        currentChartId,
      });
    };

    onLayoutChange(layout, layouts) {
      this.saveToLS("layouts", layouts);
      this.setState({ layouts });
    }
    saveChart = () => {
      const { editFormData, widgets ,layouts} = this.state;
      console.log('editFormData', editFormData)
      // 判断是否有未编辑的图表
      if (!widgets.length) {
        message.warning("未添加图表！");
        return;
      }
      if (widgets.length !== Object.keys(editFormData).length) {
        message.warning("存在未编辑图表信息！");
        return;
      }
      for (let keys in editFormData) {
        if (!("formData" in editFormData[keys])) {
          message.warning("存在未编辑图表信息！");
          return;
        }
      }
      // 把位置信息存储到editFormData的position
      layouts.lg.forEach((item, index) => {
        for (let key in editFormData) {
          if (item.i === key) {
            editFormData[key].position = item;
            editFormData[key].position.type = widgets.filter(widget => widget.i === item.i)[0].type;
            console.log('item', item);
            console.log('widgets11', widgets)
          }
        }
      });
      this.setState(
        {
          widgets: [],
        },
        () => {
          for (let keys in editFormData) {
            this.addNewChart(editFormData[keys]); 
          }
        }
      );

      message.success("保存成功");
    };
    handleCancel = () => {
      this.setState(
        {
          visible: false,
        },
        () => {
          this.props.form.resetFields();
        }
      );
    };
    handleSubmit = (e) => {
      e.preventDefault();
      this.props.form.validateFieldsAndScroll((err, values) => {
        if (!err) {
          const { editFormData, currentChartId } = this.state;
          editFormData[currentChartId] = {};
          editFormData[currentChartId].formData = values;
          this.setState({ ...this.state, visible: false }, () => {
            this.props.form.resetFields();
          });
        }
      });
    };
    render() {
      const { getFieldDecorator } = this.props.form;
      const formItemLayout = {
        labelCol: {
          xs: { span: 24 },
          sm: { span: 8 },
        },
        wrapperCol: {
          xs: { span: 24 },
          sm: { span: 16 },
        },
      };
      return (
        <Layout>
          <Header
            style={{
              position: "fixed",
              zIndex: 1,
              width: "100%",
              padding: "0 30px",
            }}
          >
            <Button
              type="primary"
              style={{ marginRight: "7px" }}
              onClick={this.addChart.bind(this, "bar")}
            >
              添加柱状图
            </Button>
            <Button
              type="primary"
              style={{ marginRight: "7px" }}
              onClick={this.addChart.bind(this, "line")}
            >
              添加折线图
            </Button>
            <Button
              type="primary"
              style={{ marginRight: "7px" }}
              onClick={this.addChart.bind(this, "pie")}
            >
              添加饼图
            </Button>
            <Button
              type="primary"
              style={{ marginLeft: "1000px" }}
              onClick={this.saveChart}
            >
              保存图表
            </Button>
          </Header>
          <Content style={{ marginTop: 44 }}>
            <div style={{ background: "#fff", padding: 20, minHeight: 800 }}>
              <ResponsiveReactGridLayout
                className="layout"
                {...this.props}
                layouts={this.state.layouts}
                onLayoutChange={(layout, layouts) =>
                  this.onLayoutChange(layout, layouts)
                }
              >
                {this.generateDOM()}
              </ResponsiveReactGridLayout>
            </div>
          </Content>
          <Modal
            title={`编辑图表信息`}
            visible={this.state.visible}
            onOk={this.handleSubmit}
            onCancel={this.handleCancel}
            okText="确认"
            cancelText="取消"
          >
            <Form {...formItemLayout}>
              <Form.Item label="图表标题">
                {getFieldDecorator("title", {
                  rules: [
                    {
                      required: true,
                      message: "Please input your title",
                    },
                  ],
                })(<Input />)}
              </Form.Item>
              <Form.Item label="是否展示图例">
                {getFieldDecorator("legend", {
                  rules: [
                    {
                      required: true,
                      message: "Please choose your chart legend",
                    },
                  ],
                })(
                  <Radio.Group>
                    <Radio value="Y">是</Radio>
                    <Radio value="N">否</Radio>
                  </Radio.Group>
                )}
              </Form.Item>

              <Form.Item label="鼠标悬浮提示数据">
                {getFieldDecorator("tooltip", {
                  rules: [
                    {
                      required: true,
                      message: "Please choose your chart tooltip",
                    },
                  ],
                })(
                  <Radio.Group>
                    <Radio value="Y">是</Radio>
                    <Radio value="N">否</Radio>
                  </Radio.Group>
                )}
              </Form.Item>
              <Form.Item
                label={
                  <span>
                    查询图表数据SQL&nbsp;
                    <Tooltip title="横轴、纵轴的字段必须以'HZ'、'ZZ'命名。eg.select xx as 'HZ', xx as 'ZZ' from xxxx...">
                      <Icon type="exclamation-circle" />
                    </Tooltip>
                  </span>
                }
              >
                {getFieldDecorator("SQL", {
                  rules: [
                    {
                      required: true,
                      message: "Please input your chart SQL",
                    },
                  ],
                })(
                  <TextArea
                    autosize={{ minRows: 4 }}
                    placeholder={`SQL格式要求：作为图表横轴、纵轴的字段必须以'HZ'、'ZZ'命名。例如:(select xx as 'HZ', xx as 'ZZ' from xxxx...)`}
                  />
                )}
              </Form.Item>
            </Form>
          </Modal>
        </Layout>
      );
    }
  }
);
