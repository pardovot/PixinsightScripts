
/*
#feature-id    Utilities > LinearStarNetPardo

#feature-info  A script that applies StarNet Process to a linear image appling a semi-reversible Histogram transformation.
#define VERSION "1.5"
#define TITLE "LinearStarNetPardo"

#include <pjsr/DataType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/ColorSpace.jsh>
#include "lib/STFAutoStretch.js"
*/

#feature-id    Pardoshit > LinearStarNetPardo

#feature-info  A script that applies StarNet Process to a linear image appling a semi-reversible Histogram transformation.
#define VERSION "1.5"
#define TITLE "LinearStarNetPardo"

#include <pjsr/DataType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/ColorSpace.jsh>
#include "lib/STFAutoStretch.js"

// Returns a push button with given text and onClick function.
function pushButtonWithTextOnClick(parent, text_, onClick_) {
   var button = new PushButton(parent);

   button.text = text_;
   button.onClick = onClick_;

   return button;
}

// The script's parameters prototype.
function LSNParPrototype() {
   this.setDefaults = function () {
      this.targetView = null;
      this.mtfShadowClip = -3.5;
      this.mtfBG = 0.1;
      this.ShowClipMap = true;
      this.OnlyTryClip = false
      this.starnetStride = StarNet.prototype.Stride_128;
      this.SNStars = false;
      this.CopyView = false;
      this.linkedRGB = false;
      this.Pc0 = 0;
      this.Pm = 0.5;

   };

   this.setParameters = function () {
      Parameters.clear();
      Parameters.set("mtfShadowClip", this.mtfShadowClip);
      Parameters.set("mtfBG", this.mtfBG);
      Parameters.set("ShowClipMap", this.ShowClipMap);
      Parameters.set("OnlyTryClip", this.OnlyTryClip);
      Parameters.set("starnetStride", this.starnetStride);
      Parameters.set("SNStars", this.SNStars);
      Parameters.set("CopyView", this.CopyView);
      Parameters.set("linkedRGB", this.linkedRGB);
      Parameters.set("Pc0", this.Pc0);
      Parameters.set("Pm", this.Pm);

   }

   this.getParameters = function () {
      this.mtfShadowClip = Parameters.has("mtfShadowClip") ? Parameters.getReal("mtfShadowClip") : -3.5;
      this.mtfBG = Parameters.has("mtfBG") ? Parameters.getReal("mtfBG") : 0.1;
      this.ShowClipMap = Parameters.has("ShowClipMap") ? Parameters.getBoolean("ShowClipMap") : true;
      this.OnlyTryClip = Parameters.has("OnlyTryClip") ? Parameters.getBoolean("OnlyTryClip") : false;
      this.starnetStride = Parameters.has("starnetStride") ? Parameters.getReal("starnetStride") : StarNet.prototype.Stride_128;
      this.SNStars = Parameters.has("SNStars") ? Parameters.getBoolean("SNStars") : false;
      this.CopyView = Parameters.has("CopyView") ? Parameters.getBoolean("CopyView") : false;
      this.linkedRGB = Parameters.has("linkedRGB") ? Parameters.getBoolean("linkedRGB") : false;
      this.Pc0 = Parameters.has("Pc0") ? Parameters.getReal("Pc0") : 0;
      this.Pm = Parameters.has("Pm") ? Parameters.getReal("Pm") : 0.5;
   }
}
var LSNPar = new LSNParPrototype();
LSNPar.setDefaults();
LSNPar.getParameters();

// User Interface
// The script's parameters dialog prototype.
function LSNDialogPrototype() {
   this.__base__ = Dialog;
   this.__base__();

   this.windowTitle = TITLE;

   this.titlePane = new Label(this);

   this.titlePane.frameStyle = FrameStyle_Box;
   this.titlePane.margin = 4;
   this.titlePane.wordWrapping = true;
   this.titlePane.useRichText = true;
   this.titlePane.text =
      "<p><b>" + TITLE + " Version " + VERSION + "</b> &mdash; " +
      "This script applies StarNet process to a linear image applying a semi-reversible Histogram transformation." +
      "<p>A linear monochrome image or a color calibrated RGB image is expected as input.</p> " +
      "<p>Thanks to Juan Conejero and Roberto Sartori for their inspiring code.</p> " +
      "<p>Copyright &copy; 2021 Edoardo Luca Radice. All Rights Reserved.</p>" +
      "<p>Updated version by Ofir Pardo.</p>";

   // Target image selection sizer and group
   this.targetView = new VerticalSizer;
   this.targetView.margin = 6;
   this.targetView.spacing = 4;

   this.viewList = new ViewList(this);
   this.viewList.getMainViews();
   if (LSNPar.targetView !== null && LSNPar.targetView.isView) {
      this.viewList.currentView = LSNPar.targetView;
   }
   else {
      LSNPar.targetView = this.viewList.currentView;;
   }
   this.viewList.onViewSelected = function (view) { LSNPar.targetView = view; }

   this.targetView.add(this.viewList);

   var CopyViewCheckBox = new CheckBox(this);

   CopyViewCheckBox.text = "Create a new view";
   CopyViewCheckBox.toolTip = "If selected StarNet will be executed on a copy of the selected view";
   CopyViewCheckBox.checked = LSNPar.CopyView;
   CopyViewCheckBox.onCheck = function (checked) {
      LSNPar.CopyView = checked;
   };
   this.targetView.add(CopyViewCheckBox);

   let linkedRGBStretch = new CheckBox(this);

   linkedRGBStretch.text = "Perform linked RGB Stretch";
   linkedRGBStretch.toolTip = "If selected the script will perform a linked RGB Stretch";
   linkedRGBStretch.checked = LSNPar.linkedRGB;
   linkedRGBStretch.onCheck = function(checked) {
      LSNPar.linkedRGB = checked;
   }

   this.targetView.add(linkedRGBStretch);

   this.TargetGroup = new GroupBox(this);
   this.TargetGroup.title = "Target view";
   this.TargetGroup.sizer = this.targetView;

   //Display Starnet parameters
   this.StarNetPane = new HorizontalSizer;
   this.StarNetPane.margin = 6;
   this.StarNetPane.spacing = 4;

   this.StridePane = new VerticalSizer;
   this.StridePane.margin = 6;
   this.StridePane.spacing = 4;

   this.Stridelabel = new Label(this);

   this.Stridelabel.frameStyle = FrameStyle_Flat;
   this.Stridelabel.margin = 0;
   this.Stridelabel.wordWrapping = false;
   this.Stridelabel.useRichText = true;
   this.Stridelabel.text = "StarNet Stride:";
   this.Stridelabel.textAlignement = 10;

   this.StridePane.add(this.Stridelabel);

   // Starnet Stride
   this.StrideListCombo = new ComboBox(this);
   var StrideList = new Array("128", "64", "32", "16", "8");
   for (var i = 0; i < StrideList.length; ++i) {
      this.StrideListCombo.addItem(StrideList[i]);
   }
   this.StrideListCombo.currentItem = LSNPar.starnetStride == 0 ? StarNet.prototype.Stride_128 : LSNPar.starnetStride;
   this.StrideListCombo.onItemSelected = function (index) {
      LSNPar.starnetStride = index;
   }

   this.StridePane.add(this.StrideListCombo);
   this.StarNetPane.add(this.StridePane);

   this.StarMaskCheckBox = new CheckBox(this);

   this.StarMaskCheckBox.text = "Create star mask";
   this.StarMaskCheckBox.toolTip = "Generate a linear starmask along with a linear starless image";
   this.StarMaskCheckBox.checked = LSNPar.SNStars;
   this.StarMaskCheckBox.onCheck = function (checked) {
      LSNPar.SNStars = checked;
   };

   this.StarNetPane.add(this.StarMaskCheckBox);

   this.StarNetGroup = new GroupBox(this);
   this.StarNetGroup.title = "StarNet Parameters";
   this.StarNetGroup.sizer = this.StarNetPane;

   this.buttonPane = new HorizontalSizer;
   this.buttonPane.spacing = 4;
   this.buttonPane.margin = 6;

   this.newInstanceButton = new ToolButton(this);
   this.newInstanceButton.icon = this.scaledResource(":/process-interface/new-instance.png");
   this.newInstanceButton.setScaledFixedSize(24, 24);
   this.newInstanceButton.toolTip = "New Instance";
   this.newInstanceButton.onMousePress = function () {
      this.hasFocus = true;
      this.pushed = false;
      LSNPar.setParameters();
      this.dialog.newInstance();
   };

   this.buttonPane.add(this.newInstanceButton);
   this.buttonPane.addStretch();
   this.buttonPane.add(pushButtonWithTextOnClick(this, "Execute", function () {
      // LSNPar.exit = false;
      this.dialog.done(5);
   }));
   this.buttonPane.add(pushButtonWithTextOnClick(this, "Close", function () {
      // LSNPar.exit = true;
      this.dialog.done(6);
   }));

   //Add all the sizers to the Form sizer
   this.sizer = new VerticalSizer;

   this.sizer.margin = 6;
   this.sizer.spacing = 6;
   this.sizer.add(this.titlePane);
   this.sizer.add(this.TargetGroup);
   this.sizer.add(this.StarNetGroup);
   this.sizer.add(this.buttonPane);

   this.adjustToContents();
   this.setFixedSize();
}

LSNDialogPrototype.prototype = new Dialog;

function DuplicateView(source, NewViewID) {

   NewViewID = NewViewID.trim()
   NewViewID = (NewViewID != "") ? NewViewID : source.id + "_clone";

   this.cloneImageWindow = new ImageWindow(
      source.image.width,
      source.image.height,
      source.image.numberOfChannels,
      source.image.bitsPerSample,
      source.image.sampleType == SampleType_Real,
      source.image.colorSpace != ColorSpace_Gray,
      NewViewID
   );

   this.cloneImageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
   this.cloneImageWindow.mainView.image.selectedPoint = new Point(0, 0);
   this.cloneImageWindow.mainView.image.apply(source.image);
   this.cloneImageWindow.mainView.image.resetSelections();
   this.cloneImageWindow.mainView.endProcess();
   NewViewID = this.cloneImageWindow.mainView.id;

   this.cloneImageWindow.visible = true;
   this.cloneImageWindow.show;
   this.cloneImageWindow.bringToFront;
   var NewView = new View(NewViewID);

   return NewView
}

function histogramTransformationProcess(htfArray) {
   let HTF = new HistogramTransformation();
   HTF.H = htfArray;
   return HTF;
}

// Transform STF array to HTF array
function stfToHtf(stfArray) {
   for (let i = 0; i < 4; i++) {
      stfArray[i][1] = stfArray[i][2];
      stfArray[i][2] = 1;
   }

   // Add 5th array
   stfArray.push([0.0, 0.5, 1.0, 0.0, 1.0]);

   return stfArray;
}

function reverseStretch(htfArray) {
   let reversedArray = [ // c0, m, c1, r0, r1
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
      [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
   ];

   for (let i = 0; i < 3; i++) {
      reversedArray[i][1] = 1 - htfArray[i][1];
   }

   return reversedArray;
}

function Subtract(IDViewA, IDViewB, offset) {

   let SUB = new PixelMath;
   SUB.expression = IDViewA + "-" + IDViewB + "+" + offset;
   return SUB

}

function getNewStarMaskView() {
   let view = View.viewById("star_mask");
   let prefix = "star_mask";

   for(let i = 99; i > 0; i--) {
      if (!View.viewById(prefix + i).isNull) {
         view = View.viewById(prefix + i);
         break;
      }
   }

   if (!view) {
      throw "Couldn't find star map view";
   }

   return view;
}

function applySTF(view, linkedRGB) {
   let stfArray = STFAutoStretch(view , undefined, undefined, linkedRGB);
   let stf = new ScreenTransferFunction;
   stf.STF = stfArray;
   if (linkedRGB) {
      stf.interaction = ScreenTransferFunction.prototype.SeparateChannels;
   }
   stf.executeOn(view);
}

function DoLinearStarnet() {

   let starlessTarget;
   let starmapTarget;

   //Define Target view
   if (LSNPar.CopyView) {
      
      starlessTarget = DuplicateView(LSNPar.targetView, LSNPar.targetView.id + "_starless");
      //Apply the transformation on a copy of the selected view
   } else {
      //Apply the transformation on the selected view
      starlessTarget = LSNPar.targetView;
      // starlessTarget = new View(LSNPar.targetView.id);
   }

   let autoStretchSTFArray = STFAutoStretch(LSNPar.targetView, undefined, undefined, false);
   let nonLinearHtfArray = stfToHtf(autoStretchSTFArray);
   let nonLinearProcess = histogramTransformationProcess(nonLinearHtfArray);

   let deLinearArray = reverseStretch(nonLinearHtfArray);
   let deLinearProcess = histogramTransformationProcess(deLinearArray);

   let starnetProcess = new StarNet;
   starnetProcess.stride = LSNPar.starnetStride;
   starnetProcess.mask = LSNPar.SNStars;

   starlessTarget.window.bringToFront();
   
   let processContainer = new ProcessContainer;
   processContainer.add(nonLinearProcess);
   processContainer.add(starnetProcess);
   processContainer.add(deLinearProcess);
   processContainer.executeOn(starlessTarget, true);

   applySTF(starlessTarget, false);

   if (LSNPar.SNStars) {
      starmapTarget = getNewStarMaskView();
      starmapTarget.id = LSNPar.targetView.id + "_starmap";
   }

}

function main() {
   console.show();

   if (Parameters.isViewTarget) {
      LSNPar.getParameters();
      LSNPar.targetView = Parameters.targetView;
      DoLinearStarnet();
      return;
   }

   if (Parameters.isGlobalTarget) {
      LSNPar.getParameters();
   }

   LSNPar.targetView = ImageWindow.activeWindow.currentView;
   let parametersDialog = new LSNDialogPrototype();
   LSNPar.exit = false;
   let retVal = parametersDialog.execute();
   if (retVal != 5) return;

   DoLinearStarnet();
}

main();
