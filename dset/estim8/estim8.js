/**
 * Created by tim on 1/18/17.


 ==========================================================================
 estim8.js in gamePrototypes.

 Author:   Tim Erickson

 Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 ==========================================================================


 */

// const codapInterface = require("../../common/CodapInterface");

function startCodapConnection() {
    var config = {
        title: "Estimation",
        version: "001",
        dimensions: {width: 330, height: 240}
    };

    console.log("Starting codap connection");

    codapInterface.init(config).then(
        function () { //  interactive state is populated!
            estim8.state = codapInterface.getInteractiveState();  // |S| initialize state variable!
            estim8.initialize();
            return Promise.resolve();
        }
    ).catch(function (msg) {
        console.log('warn: ' + msg);
    });
}

/**
 * This is the one global, a singleton, that we need or this game.
 * @type {{initialize: estimate.initialize, newGame: estimate.newGame, endGame: estimate.endGame, newTurn: estimate.newTurn, endTurn: estim8.endTurn}}
 */
var estim8 = {
    // here's where we store the components with their position and id once they get created
    componentList: [],

    initialize: function () {

        this.stripView.initialize();
        if (this.state.restored) { //  we are restoring this from a file
            if (this.state.playing) {
                this.state.lastClickPosition = this.state.currentTruth;
                this.stripView.movePointerTo(this.state.currentTruth);
                this.stripView.setPointerVisibility(true);
            }
            // estim8.makeAGraph("Asked for a graph, restored data");
        } else {        //  we're starting fresh, with a new data set.
            pluginHelper.initDataSet(estim8.dataSetDescription).then(
                function () {
                    console.log("im in init data set");
                    codapInterface.on('notify', 'component', 'create', estim8.componentCreateHandler);
                    codapInterface.on('notify', 'component', 'delete', estim8.componentDeleteHandler);
                    codapInterface.on('notify', 'component', 'move', estim8.componentChangeHandler);
                    // estim8.makeAGraph("Asked for a graph, new Data Context");
                }
            );
        }
        this.state.restored = true;
    },

    makeAGraph: function (iMessage) {
        codapInterface.sendRequest(estim8.constants.graphCreationObject).then(
            function () {
                console.log(iMessage);
            }
        )
    },

    /**
     * Called when the user asks for a new game (by pressing the button)
     */
    newGame: function () {
        //  |M| in Part 2, this is where you will tell CODAP we're interested in selection
        codapInterface.on('notify', 'dataContextChangeNotice[estimates]', estim8.codapSelects);  //  remove

        this.state.playing = true;
        this.state.turnNumber = 0;
        this.state.currentScore = 0;
        this.state.gameNumber += 1;
        this.newTurn();
    },

    /**
     * When we run out of turns, the game ends
     * (We would also call this if a user ends a game prematurely)
     * In a more mature game, we might also emit some data here
     */
    endGame: function () {
        this.state.playing = false;
        var tMessage = "Game over! Your score is " + this.state.currentScore.toFixed(2);
        alert(tMessage);
    },

    /**
     * Called to initiate a new turn.
     * Here is where we pick the random value for the number
     */
    newTurn: function () {
        this.state.turnNumber += 1;
        this.state.currentTruth = Math.random();
        this.stripView.movePointerTo(this.state.currentTruth);
        this.stripView.setPointerVisibility(true);
    },

    /**
     * Called when the user submits an estim8.
     * Finds the value the user entered, computes the difference,
     * updates the score, records the resulats
     */
    endTurn: function () {
        var valueFieldString = document.getElementById("valueField").value;
        estim8.state.lastInputNumber = Number(valueFieldString);

        var tDelta = this.state.currentTruth - this.state.lastInputNumber;

        //  |A| set the value of the player name here.
        this.state.playerName = document.getElementById('yourName').value;

        var tCaseValues = {
            truth: this.state.currentTruth,
            estimate: this.state.lastInputNumber,
            player: this.state.playerName,
            turnNo: this.state.turnNumber
            //  |C|     here is where you put additional values to save. Watch out for commas!
        };
        pluginHelper.createItems(tCaseValues);

        this.state.currentScore += Math.abs(tDelta);
        console.log("Turn " + this.state.turnNumber + " score " + this.state.currentScore);
        if (this.state.turnNumber >= this.constants.turnsPerGame) {
            this.endGame();
        }
        this.fixUI();
        this.newTurn();
    }
};

/**
 * If we were to adjust what the user sees (e.g., change the button
 * title from New game to End game; or make some buttons invisible
 * at different game phases) we could do it here
 *
 * We could put this in the original definition of "estim8"
 * but I extracted it for clarity
 */
estim8.fixUI = function () {

};

/**
 * Called when the user selects a case (or cases) in CODAP
 * @param iMessage
 */
estim8.codapSelects = function (iMessage) {      //  |N| part of part 2 solution
    var tMessageValue = iMessage.values;
    if (Array.isArray(tMessageValue)) {
        tMessageValue = tMessageValue[0]; //      the first of the values in the message
    }
    console.log("Received a " + tMessageValue.operation + " message");
    console.log("here's the message ");
    console.log(JSON.stringify(tMessageValue));
    //      remove

    if (tMessageValue.operation == "selectCases") {
        var tFirstCase = tMessageValue.result.cases[0];
        if (tFirstCase) {
            var tTruth = tFirstCase.values.truth;
            var tGuess = tFirstCase.values.estimate;
            console.log("Found selected truth = " + tTruth);
            estim8.stripView.moveSelectionValues(tTruth, tGuess);
            estim8.stripView.setSelectionVisibility(true);
        } else {
            console.log("No one is selected!")
        }
    }

    //      end remove

};

estim8.componentChangeHandler = function(imsg) {
    console.log("i'm here for the component change: ");
    console.log(imsg);
};
estim8.componentCreateHandler = function(imsg) {
    console.log("A component just got create : ");
    console.log(imsg);
    
    if(imsg.values.type !== "graph")
        return;
    
    sayhi();
    

};
estim8.componentDeleteHandler = function(imsg) {
    console.log("a component just got deleted: ");
    console.log(imsg);
};

/**
 * The "state" member variable.
 * Anything you want saved and restored that is NOT in CODAP, you put here,
 * @type {{playerName: string, lastClickPosition: number, lastInputNumber: number, gameNumber: number, turnNumber: number, currentScore: number, currentTruth: number, playing: boolean, restored: boolean}}
 */
estim8.state = {
    playerName: "Eleanor",
    lastClickPosition: -1,
    lastInputNumber: -1,
    gameNumber: 0,
    turnNumber: 0,
    currentScore: 0,
    currentTruth: -1,
    playing: false,
    restored: false         //  is this restored from a saved file?
};

/**
 * A convenient place to stash constants
 * @type {{version: string, stripWidth: number, turnsPerGame: number}}
 */
estim8.constants = {
    version: "001",
    resourceString: 'dataContextChangeNotice\\[estimates\\]',
    graphCreationObject: {
        action: 'create',
        resource: 'component',
        values: {
            type: 'graph',
            name: 'comparison',
            dimensions: {
                width: 240,
                height: 240
            },
            position: 'top',
            dataContext: 'estimates',
            xAttributeName: 'truth',
            yAttributeName: 'estimate'
        }
    },
    stripWidth: 300,
    turnsPerGame: 10
};

/**
 * This is a view.
 * It might be better in a different file, but it's SO small here
 * that including it makes it possible to put everything in one file.
 *
 * @type {{initialize: estimate.stripView.initialize, setPointerVisibility: estimate.stripView.setPointerVisibility, movePointerTo: estim8.stripView.movePointerTo, click: estimate.stripView.click}}
 */
estim8.stripView = {
    initialize: function () {
        this.paper = Snap(document.getElementById("estimationStrip"));    //    create the underlying svg "paper"
        this.paper.node.addEventListener("click", estim8.stripView.click, false);   //  not used initially

        //  |R| These two objects, initially hidden, are for session 2.
        this.guessLine = this.paper.line(50, 0, 50, 40).attr({stroke: "white", visibility: "hidden"});
        this.truthCircle = this.paper.circle(50, 20, 10).attr({fill: "lightgray", visibility: "hidden"});

        this.pointer = this.paper.circle(100, 20, 10);
        this.setPointerVisibility(false);
    },

    /**
     * Make the black circle visible or invisible   |Q|
     * @param iVisible  true if it's to be visible
     */
    setPointerVisibility: function (iVisible) {
        this.pointer.attr({visibility: iVisible ? "visible" : "hidden"});
    },

    setSelectionVisibility: function (iVisible) {
        this.truthCircle.attr({visibility: iVisible ? "visible" : "hidden"});
        this.guessLine.attr({visibility: iVisible ? "visible" : "hidden"});
    },

    /**
     * Move the black circle    |P|
     * @param iWhere    move it here (this is the decimal value in [0,1) )
     */
    movePointerTo: function (iWhere) {
        var tX = iWhere * estim8.constants.stripWidth;    //  convert from decimal to pixels
        this.pointer.attr({"cx": tX});      //  how you move an object in Snap. "cx" is the x-center of the Circle
    },

    moveSelectionValues: function (iTruth, iGuess) {
        var tX = iTruth * estim8.constants.stripWidth;    //  convert from decimal to pixels
        this.truthCircle.attr({"cx": tX});      //  how you move an object in Snap. "cx" is the x-center of the Circle
        tX = iGuess * estim8.constants.stripWidth;
        this.guessLine.attr({"x1": tX, "x2": tX});
    },

    /**
     * This is how you can process a click in the "estimation strip" itself.
     * Not needed in the DSET session unless you want to "reverse" the sense of the estimation.
     * @param iEvent
     */
    click: function (iEvent) {
        var tWhere = findLocalPoint(iEvent);
        estim8.state.lastClickPosition = tWhere.x / estim8.constants.stripWidth;
        estim8.endTurn();
    }

};

/**
 * Fussy utility function for converting click to user coordinates.
 * Not needed in the DSET session unless you want to "reverse" the sense of the estimation.
 * @param iEvent
 * @returns {*}
 */
function findLocalPoint(iEvent) {
    var uupos = iEvent.currentTarget.createSVGPoint();
    uupos.x = iEvent.clientX;
    uupos.y = iEvent.clientY;   //  we will not use this!

    var ctmInverse = iEvent.target.getScreenCTM().inverse();

    if (ctmInverse) {
        uupos = uupos.matrixTransform(ctmInverse);
    }
    return uupos
}

/**
 * Constant CODAP needs to initialize our data set (a.k.a. Data Context)
 *
 * @type {{name: string, title: string, description: string, collections: [*]}}
 */
estim8.dataSetDescription = {
    name: "estimates",
    title: "Estimates",
    description: "a set of estimates",
    collections: [
        {
            name: "estimates",
            parent: null,       //  this.gameCollectionName,    //  this.bucketCollectionName,
            labels: {
                singleCase: "estimate",
                pluralCase: "estimates",
                setOfCasesWithArticle: "set of estimates"
            },

            attrs: [
                {name: "truth", type: 'numeric', precision: 3, description: "true value"},
                {name: "estimate", type: 'numeric', precision: 3, description: "estimated value"},
                {name: "player", type: 'categorical', description: "your name"},
                {name: "turnNo", type: 'numeric', precision: 0, description: "Turn number"}
                //  |B|     here is where you make attributes in the data set, i.e., columns in the table
            ]
        }
    ]
};