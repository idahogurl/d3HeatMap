"use strict";
var SERVICE_URL = "https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json";
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
/*
   "baseTemperature": 8.66,
  "monthlyVariance": [
    {
      "year": 1753,
      "month": 1,
      "variance": -1.366
    },
    {
      "year": 1753,
      "month": 2,
      "variance": -2.223
    },
    */
require("./sass/styles.scss");
var D3 = require("d3");
var sprintf_js_1 = require("sprintf-js");
var HeatRecord = (function () {
    function HeatRecord(year, month, variance) {
        this.variance = variance;
        this.monthYear = new Date(year, month - 1);
    }
    return HeatRecord;
}());
var Temperature = (function () {
    function Temperature() {
    }
    //http://www.jacklmoore.com/notes/rounding-in-javascript/    
    Temperature.round = function (value, decimals) {
        return Number(value.toExponential(decimals));
    };
    return Temperature;
}());
var Margin = (function () {
    function Margin(top, right, bottom, left) {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
    }
    return Margin;
}());
var HeatMap = (function () {
    function HeatMap() {
        this.margin = new Margin(35, 40, 180, 120);
        this.height = 650 - this.margin.top - this.margin.bottom;
        this.width = 1300 - this.margin.left - this.margin.right;
        this.chartData = [];
        this.fetchData();
    }
    HeatMap.prototype.fetchData = function () {
        var tempData = [];
        var _this = this;
        D3.json(SERVICE_URL, function (d) {
            debugger;
            _this.baseTemperature = d.baseTemperature;
            d.monthlyVariance.forEach(function (i) {
                tempData.push(new HeatRecord(i.year, i.month, i.variance));
            });
            _this.minVariance = D3.min(tempData, function (d) {
                return d.variance;
            });
            _this.maxVariance = D3.max(tempData, function (d) {
                return d.variance;
            });
            _this.minDate = D3.min(tempData, function (d) {
                return d.monthYear;
            });
            _this.maxDate = D3.max(tempData, function (d) {
                return d.monthYear;
            });
            _this.chartData = D3.nest().key(function (d) {
                return d.monthYear.getMonth().toString();
            })
                .entries(tempData);
            _this.createChart();
        });
    };
    HeatMap.prototype.createChart = function () {
        var _this = this;
        //when creating the svg chart, "this" is a reference to the svg object not the object instance
        //store the object data in local variables
        var width = this.width;
        var height = this.height;
        var margin = this.margin;
        var chartData = this.chartData;
        //http://tech.just-eat.com/2014/03/11/creating-a-heat-map-with-d3/
        //http://jonathansoma.com/tutorials/d3/color-scale-examples/
        this.yScale = new VerticalScale(this.height);
        this.colorScale = new ColorScale(this.baseTemperature + this.minVariance, this.baseTemperature + this.maxVariance);
        this.xScale = new HorizontalScale(this.width, this.minDate, this.maxDate);
        var self = this;
        this.svgChart = D3.select("#chart")
            .append("svg")
            .style("background", "#FFF")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
        var baseTemperature = this.baseTemperature;
        var tooltip = Tooltip.get();
        var _loop_1 = function (i) {
            this_1.svgChart.append("g")
                .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
                .selectAll("rect")
                .data(this_1.chartData[i.toString()]["values"])
                .enter()
                .append("rect")
                .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
                .style("fill", function (d) {
                return _this.colorScale.scale(Temperature.round(self.baseTemperature + d.variance, 3));
            })
                .attr("x", function (d) {
                return self.xScale.scale(d.monthYear) - margin.left;
            })
                .attr("y", function (d) {
                return (height / 12) * (i - 1);
            })
                .attr("width", 5)
                .attr("height", function (d) {
                return height / 12;
            })
                .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(Tooltip.getText(d, self.baseTemperature))
                    .style("left", D3.event.pageX.toString() + "px")
                    .style("top", (D3.event.pageY - 100).toString() + "px");
                D3.select(D3.event.currentTarget)
                    .style("cursor", "pointer");
            })
                .on("mouseout", function () {
                tooltip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        };
        var this_1 = this;
        for (var i = 0; i < MONTH_NAMES.length; i++) {
            _loop_1(i);
        }
        this.addHorizontalAxis();
        this.addVerticalAxis();
        var legend = new Legend(this);
        legend.addColorBoxes();
        legend.addLabels();
    };
    HeatMap.prototype.addHorizontalAxis = function () {
        var axis = D3.axisBottom(this.xScale.scale)
            .ticks(D3.timeYear, 10)
            .tickFormat(D3.timeFormat("%Y"));
        var xAxisLabel = new Label(new Point(this.width / 2 + 100, this.height + this.margin.top + 40), "Years", false);
        var xAxis = new Axis(this);
        xAxis.add(axis, new Point(this.margin.left, this.margin.top + this.height), xAxisLabel);
    };
    HeatMap.prototype.addVerticalAxis = function () {
        var height = this.height;
        var axis = D3.axisLeft(this.yScale.scale)
            .tickFormat(D3.timeFormat("%B"));
        var yAxisLabel = new Label(new Point(this.height / 2 - this.height, this.margin.right), "Months", true);
        var xAxis = new Axis(this);
        xAxis.add(axis, new Point(this.margin.left, this.margin.top), yAxisLabel);
    };
    return HeatMap;
}());
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    return Point;
}());
var Label = (function () {
    function Label(location, text, vertical) {
        this.location = location;
        this.text = text;
        this.vertical = vertical;
    }
    return Label;
}());
var Axis = (function () {
    function Axis(chart) {
        this.chart = chart;
    }
    Axis.prototype.add = function (axis, location, label) {
        var height = this.chart.height;
        var margin = this.chart.margin;
        var hGuide = chart.svgChart.append("g").style("font-size", "12px").call(axis);
        hGuide.attr("transform", "translate (" + location.x + ", " +
            location.y + ")")
            .selectAll("path")
            .style("fill", "none")
            .style("stroke", "#000")
            .selectAll("line")
            .style("stroke", "#000");
        this.addLabel(label);
    };
    Axis.prototype.addLabel = function (label) {
        var svgLabel = chart.svgChart.append("g")
            .append("text")
            .style("font-weight", "bold")
            .attr("y", label.location.y)
            .attr("x", label.location.x)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(label.text);
        if (label.vertical)
            svgLabel.attr("transform", "rotate(-90)");
    };
    return Axis;
}());
var VerticalScale = (function () {
    function VerticalScale(chartHeight) {
        this.scale = D3.scaleTime()
            .domain([new Date(2017, 0, 1), new Date(2017, 11, 1)])
            .range([0, chartHeight]);
    }
    return VerticalScale;
}());
var HorizontalScale = (function () {
    function HorizontalScale(chartWidth, minDate, maxDate) {
        this.scale = D3.scaleTime()
            .domain([minDate, maxDate])
            .range([0, chartWidth]);
    }
    return HorizontalScale;
}());
var ColorScale = (function () {
    function ColorScale(minTemperature, maxTemperature) {
        this.colors = ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598",
            "#ffffbf", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"];
        this.scale = D3.scaleQuantile()
            .domain([minTemperature, maxTemperature])
            .range(this.colors);
    }
    return ColorScale;
}());
var Legend = (function () {
    function Legend(chart) {
        this.quantiles = chart.colorScale.scale.quantiles();
        this.quantiles.unshift(0);
        this.width = 25;
        this.x = chart.width - (this.width * chart.colorScale.colors.length) + chart.margin.left;
        this.svgChart = chart.svgChart;
    }
    Legend.prototype.addColorBoxes = function () {
        var _this = this;
        var self = this;
        this.svgChart
            .append("g")
            .selectAll("rect")
            .data(chart.colorScale.colors)
            .enter()
            .append("rect")
            .style("fill", function (d) {
            return d;
        })
            .attr("width", this.width)
            .attr("height", 10)
            .attr("x", function (x, i) {
            return _this.x + (i * _this.width);
        })
            .attr("y", function (y, i) {
            return chart.height + chart.margin.bottom - chart.margin.top;
        });
        this.addLabels();
    };
    Legend.prototype.addLabels = function () {
        var _this = this;
        this.svgChart.append("g").selectAll("text")
            .data(this.quantiles)
            .enter()
            .append("text")
            .style("text-anchor", "middle")
            .attr("x", function (x, i) {
            return _this.x + (i * _this.width) + 10;
        })
            .attr("y", function (y, i) {
            return chart.height + chart.margin.bottom - chart.margin.top + 30;
        })
            .text(function (t) {
            t = Temperature.round(t, 1);
            return t.toString().length === 1 ? t + ".0" : t;
        });
    };
    return Legend;
}());
var Tooltip = (function () {
    function Tooltip() {
    }
    Tooltip.get = function () {
        return D3.select("#tooltip")
            .append("div")
            .style("pointer-events", "none")
            .style("position", "absolute")
            .style("padding", "10px")
            .style("background", "black")
            .style("color", "white")
            .style("width", "150px")
            .style("opacity", 0);
    };
    Tooltip.getText = function (heatRecord, baseTemp) {
        return sprintf_js_1.sprintf("%s - %s<br/>%s &#x2103;<br/>%s &#x2103;", heatRecord.monthYear.getFullYear(), MONTH_NAMES[heatRecord.monthYear.getMonth()], Temperature.round(heatRecord.variance + baseTemp, 3), Temperature.round(heatRecord.variance, 3));
    };
    return Tooltip;
}());
var chart = new HeatMap();
