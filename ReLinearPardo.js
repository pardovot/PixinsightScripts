
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

#feature-id    Pardoshit > ReLinearPardo

#feature-info  A script that applies StarNet Process to a linear image appling a semi-reversible Histogram transformation.
#define VERSION "1.0"
#define TITLE "ReLinearPardo"

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
      this.linearView = null;
      this.CopyView = false;

   };

   this.setParameters = function () {
      Parameters.clear();
      Parameters.set("CopyView", this.CopyView);

   }

   this.getParameters = function () {
      this.CopyView = Parameters.has("CopyView") ? Parameters.getBoolean("CopyView") : false;
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
      "This script turns a non-linear image back to linear image by calculating the reversing of STF " +
      "<p>Copyright &copy; 2021 Ofir Pardo. All Rights Reserved.</p>";

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

   this.TargetGroup = new GroupBox(this);
   this.TargetGroup.title = "Target view";
   this.TargetGroup.sizer = this.targetView;

   //Display Starnet parameters
   this.linearPane = new HorizontalSizer;
   this.linearPane.margin = 6;
   this.linearPane.spacing = 4;

   this.linearViewList = new ViewList(this);
   this.linearViewList.getMainViews();

   if (LSNPar.linearView !== null && LSNPar.linearView.isView) {
      this.linearViewList.currentView = LSNPar.linearView;
   } else {
      LSNPar.linearView = this.linearViewList.currentView;;
   }

   this.linearViewList.onViewSelected = function (view) { LSNPar.linearView = view; }

   this.linearPane.add(this.linearViewList);

   this.linearViewGroup = new GroupBox(this);
   this.linearViewGroup.title = "Linear Image View";
   this.linearViewGroup.sizer = this.linearPane;

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
   this.sizer.add(this.linearViewGroup);
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

function ReLinear() {
   if (!LSNPar.targetView.isView || !LSNPar.linearView.isView) {
      throw "No proper linear or target view";
   }

   let targetView;

   //Define Target view
   if (LSNPar.CopyView) {
      
      targetView = DuplicateView(LSNPar.targetView, LSNPar.targetView.id + "_clone");
      //Apply the transformation on a copy of the selected view
   } else {
      //Apply the transformation on the selected view
      targetView = LSNPar.targetView;
      // starlessTarget = new View(LSNPar.targetView.id);
   }

   // if (LSNPar.linearView.isView() && LSNPar.targetView.isView()) {
      let autoStretchSTFArray = STFAutoStretch(LSNPar.linearView, undefined, undefined, false);
      let reLinearHtfArray = stfToHtf(autoStretchSTFArray);
      let reLinearArray = reverseStretch(reLinearHtfArray);
      let reLinearProcess = histogramTransformationProcess(reLinearArray);
   
      targetView.window.bringToFront();
      reLinearProcess.executeOn(targetView);

   // } else {
   //    throw "No proper linear or target view";
   // }

}

function main() {
   console.show();

   if (Parameters.isViewTarget) {
      LSNPar.getParameters();
      LSNPar.targetView = Parameters.targetView;
      ReLinear();
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

   ReLinear();
}

main();
