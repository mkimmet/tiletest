var Movement = {
    GetDuration: function(baseSpeed,direction, distance, verticleSpeedAdjustment){
        var adjustment = 1;
        if(direction == "up" || direction == "down"){
            adjustment = verticleSpeedAdjustment;
        }
        return distance/baseSpeed * adjustment;
    },
    GetDirection: function(endX, endY, startX, startY, angle){
        //Calculate the direction
        if (endY < startY && angle > 40 && angle < 160) {
            return "up";
        } else if (endY > startY && angle < -40 && angle > -160) {
            return "down";
        } else if (endX > startX) {
            return "right";
        } else {
            return "left";
        }
    },
    GetStartPoint: function(character){
        var startX = character.x+(character.width/2);
        var startY = character.y;//character.bottom
        return {x:startX,y:startY};
    },
    GetAdjustedEndPoint: function(character,endPoint, scaleSize, screenHeight){
        console.log(screenHeight);
        var endX = endPoint.x - (character.data.imageSize[character.data.direction].width * this.GetScaleSizeAtPoint(character,endPoint,screenHeight) / 2);
        var endY = endPoint.y - (character.data.imageSize[character.data.direction].height * this.GetScaleSizeAtPoint(character,endPoint,screenHeight));
        return {x:endX,y:endY};
    },
    GetScaleSizeAtPoint: function(character,point, screenHeight){
        return point.y / screenHeight * character.data.defaultScale + character.scaleMin;
    },
    BufferEndPoint: function(point,endPoint,direction,adjustedEndPoint){
        if(point != endPoint){
            if(direction == "up"){
                adjustedEndPoint = {x: adjustedEndPoint.x, y: adjustedEndPoint.y + 1};
            }else if(direction == "down"){
                adjustedEndPoint = {x: adjustedEndPoint.x, y: adjustedEndPoint.y - 1};
            }else if(direction == "right"){
                adjustedEndPoint = {x: adjustedEndPoint.x - 1, y: adjustedEndPoint.y};
            }else{ 
                adjustedEndPoint = {x: adjustedEndPoint.x + 1, y: adjustedEndPoint.y};
            }
        }
        return adjustedEndPoint;
    }
};