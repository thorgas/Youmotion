import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { RadarChart, type RadarSeriesOption } from 'echarts/charts';
import {
  RadarComponent,
  type RadarComponentOption,
} from 'echarts/components';
import {
  init,
  use as registerECharts,
  type ComposeOption,
  type EChartsType,
} from 'echarts/core';
import { PureComponent, createRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { APP_TYPE } from '@/constants';
import type { EmotionFrequency } from '../domain/check-in-analytics';

registerECharts([RadarChart, RadarComponent, SVGRenderer]);

type RadarOption = ComposeOption<RadarComponentOption | RadarSeriesOption>;

type EmotionRadarChartProps = Readonly<{
  colors: readonly string[];
  frequencies: readonly EmotionFrequency[];
  labels: readonly string[];
  width: number;
}>;

const CHART_HEIGHT = 292;

export class EmotionRadarChart extends PureComponent<EmotionRadarChartProps> {
  private readonly _chartRef = createRef<HTMLElement>();
  private _chart: EChartsType | null = null;

  override componentDidMount() {
    const element = this._chartRef.current;
    if (!element) return;
    this._chart = init(element, null, {
      renderer: 'svg',
      width: this.props.width,
      height: CHART_HEIGHT,
    });
    this._chart.setOption(this._option());
  }

  override componentDidUpdate(previous: EmotionRadarChartProps) {
    if (!this._chart) return;
    if (previous.width !== this.props.width) {
      this._chart.resize({ width: this.props.width, height: CHART_HEIGHT });
    }
    this._chart.setOption(this._option(), true);
  }

  override componentWillUnmount() {
    this._chart?.dispose();
    this._chart = null;
  }

  private _option(): RadarOption {
    const maximum = Math.max(...this.props.frequencies.map(({ count }) => count), 1);
    const emotionLabelStyles: Record<string, {
      color: string;
      fontFamily: string;
      fontSize: number;
    }> = {};
    this.props.colors.forEach((color, index) => {
      emotionLabelStyles[`emotion${index}`] = {
        color,
        fontFamily: APP_TYPE.semibold,
        fontSize: 13,
      };
    });
    return {
      animation: false,
      radar: {
        axisLine: { lineStyle: { color: 'rgba(42, 39, 34, 0.16)' } },
        axisName: {
          color: '#2A2722',
          fontFamily: APP_TYPE.medium,
          fontSize: 12,
          formatter: (name?: string) => {
            if (!name) return '';
            const index = this.props.labels.indexOf(name);
            return index < 0 ? name : `{emotion${index}|●} {label|${name}}`;
          },
          rich: {
            ...emotionLabelStyles,
            label: {
              color: '#2A2722',
              fontFamily: APP_TYPE.medium,
              fontSize: 12,
            },
          },
        },
        center: ['50%', '51%'],
        indicator: this.props.labels.map((name) => ({ name, max: maximum })),
        radius: '66%',
        shape: 'circle',
        splitArea: {
          areaStyle: {
            color: ['rgba(94, 111, 97, 0.02)', 'rgba(94, 111, 97, 0.06)'],
          },
        },
        splitLine: { lineStyle: { color: 'rgba(42, 39, 34, 0.10)' } },
        splitNumber: 4,
      },
      series: [{
        areaStyle: { color: 'rgba(94, 111, 97, 0.24)' },
        data: [{ value: this.props.frequencies.map(({ count }) => count) }],
        lineStyle: { color: '#5E6F61', width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#5E6F61' },
        type: 'radar',
      }],
    };
  }

  override render() {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.chart, { width: this.props.width }]}
        testID="analytics-emotion-radar"
      >
        <SvgChart ref={this._chartRef} style={styles.chartCanvas} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  chart: { alignSelf: 'center', height: CHART_HEIGHT },
  chartCanvas: { height: CHART_HEIGHT },
});
